using FinTree.Domain.Currencies;
using FinTree.Domain.ValueObjects;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System.Globalization;

namespace FinTree.Infrastructure;

public class FxLoader(
    IServiceProvider serviceProvider,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<FxLoader> logger) : BackgroundService
{
    private const string UrlTemplate =
        "https://api.forexrateapi.com/v1/latest?api_key={0}&base=USD&currencies={1}";

    private readonly TimeSpan _defaultDelay = TimeSpan.FromHours(24);
    private readonly string? _apiKey = configuration["FxRates:ApiKey"];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            logger.LogWarning("FxRates:ApiKey is missing. FxLoader is disabled.");
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await LoadLatestRatesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "FxLoader failed. Next run in {Delay}.", _defaultDelay);
            }

            await Task.Delay(_defaultDelay, stoppingToken);
        }
    }

    private async Task LoadLatestRatesAsync(CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        using var httpClient = httpClientFactory.CreateClient();

        // USD is a base currency and always equals 1, storing it in table is unnecessary.
        var expectedCurrencyCodes = Currency.All
            .Select(c => c.Code.Trim().ToUpperInvariant())
            .Where(code => !string.Equals(code, "USD", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (expectedCurrencyCodes.Count == 0)
        {
            logger.LogWarning("FxLoader has no expected currencies configured.");
            return;
        }

        var url = string.Format(
            CultureInfo.InvariantCulture,
            UrlTemplate,
            _apiKey,
            string.Join(',', expectedCurrencyCodes.OrderBy(code => code, StringComparer.OrdinalIgnoreCase)));
        var result = await httpClient.GetAsync(url, ct);
        result.EnsureSuccessStatusCode();

        var content = await result.Content.ReadAsStringAsync(ct);
        var payload = JObject.Parse(content);
        var ratesPayload = payload["rates"]?.ToObject<Dictionary<string, decimal>>() ?? [];

        if (!long.TryParse(payload["timestamp"]?.ToString(), out var timestamp))
        {
            logger.LogWarning("FxLoader response has no valid timestamp. Rates were skipped.");
            return;
        }

        var dayStartUtc = DateTime.SpecifyKind(
            DateTimeOffset.FromUnixTimeSeconds(timestamp).UtcDateTime.Date,
            DateTimeKind.Utc);
        var nextDayStartUtc = dayStartUtc.AddDays(1);

        var existingCodes = await context.FxUsdRates
            .Where(r => r.EffectiveDate >= dayStartUtc && r.EffectiveDate < nextDayStartUtc)
            .Select(r => r.CurrencyCode)
            .Distinct()
            .ToListAsync(ct);
        var existingCodeSet = existingCodes
            .Select(code => code.Trim().ToUpperInvariant())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var toInsert = new List<FxUsdRate>(expectedCurrencyCodes.Count);
        foreach (var (rawCode, value) in ratesPayload)
        {
            var normalizedCode = rawCode.Trim().ToUpperInvariant();
            if (!expectedCurrencyCodes.Contains(normalizedCode) || value <= 0m || existingCodeSet.Contains(normalizedCode))
                continue;

            toInsert.Add(new FxUsdRate(normalizedCode, dayStartUtc, value));
        }

        if (toInsert.Count > 0)
        {
            await context.FxUsdRates.AddRangeAsync(toInsert, ct);
            try
            {
                await context.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex)
            {
                logger.LogWarning(ex, "FxLoader detected duplicate insert race for day {Day}.", dayStartUtc.Date);
            }
        }

        var providerCodes = ratesPayload.Keys
            .Select(code => code.Trim().ToUpperInvariant())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missingFromProvider = expectedCurrencyCodes
            .Except(providerCodes, StringComparer.OrdinalIgnoreCase)
            .OrderBy(code => code, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (missingFromProvider.Length > 0)
        {
            logger.LogWarning(
                "FxLoader provider did not return currencies for {Day}: {Currencies}. They were skipped until next run.",
                dayStartUtc.Date,
                string.Join(',', missingFromProvider));
        }

        logger.LogInformation(
            "FxLoader stored {InsertedCount} FX rates for {Day}.",
            toInsert.Count,
            dayStartUtc.Date);
    }
}
