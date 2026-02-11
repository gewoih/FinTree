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
    private readonly TimeSpan _retryDelay = TimeSpan.FromHours(1);
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
                var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));
                var delay = await LoadMissingRatesForDayAsync(targetDate, stoppingToken);
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "FxLoader failed. Retrying in {Delay}.", _retryDelay);
                await Task.Delay(_retryDelay, stoppingToken);
            }
        }
    }

    private async Task<TimeSpan> LoadMissingRatesForDayAsync(DateOnly targetDate, CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        using var httpClient = httpClientFactory.CreateClient();

        var dayStartUtc = targetDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var nextDayStartUtc = targetDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        // USD is a base currency and always equals 1, storing it in table is unnecessary.
        var expectedCurrencyCodes = Currency.All
            .Select(c => c.Code.Trim().ToUpperInvariant())
            .Where(code => !string.Equals(code, "USD", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var existingCodes = await context.FxUsdRates
            .Where(r => r.EffectiveDate >= dayStartUtc && r.EffectiveDate < nextDayStartUtc)
            .Select(r => r.CurrencyCode)
            .Distinct()
            .ToListAsync(ct);

        var missingCodes = expectedCurrencyCodes
            .Except(existingCodes, StringComparer.OrdinalIgnoreCase)
            .OrderBy(code => code, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (missingCodes.Length == 0)
            return _defaultDelay;

        var url = string.Format(CultureInfo.InvariantCulture, UrlTemplate, _apiKey, string.Join(',', missingCodes));
        var result = await httpClient.GetAsync(url, ct);
        result.EnsureSuccessStatusCode();

        var content = await result.Content.ReadAsStringAsync(ct);
        var payload = JObject.Parse(content);
        var ratesPayload = payload["rates"]?.ToObject<Dictionary<string, decimal>>() ?? [];
        var requestedCodes = missingCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var toInsert = new List<FxUsdRate>(missingCodes.Length);
        foreach (var (rawCode, value) in ratesPayload)
        {
            var normalizedCode = rawCode.Trim().ToUpperInvariant();
            if (!requestedCodes.Contains(normalizedCode) || value <= 0m)
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
                logger.LogWarning(ex, "FxLoader detected duplicate insert race for day {Day}.", dayStartUtc);
            }
        }

        var loadedCodes = await context.FxUsdRates
            .Where(r => r.EffectiveDate >= dayStartUtc && r.EffectiveDate < nextDayStartUtc)
            .Select(r => r.CurrencyCode)
            .Distinct()
            .ToListAsync(ct);

        var remainingCodes = expectedCurrencyCodes
            .Except(loadedCodes, StringComparer.OrdinalIgnoreCase)
            .OrderBy(code => code, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (remainingCodes.Length == 0)
            return _defaultDelay;

        logger.LogWarning(
            "FxLoader loaded partial dataset for {Day}. Missing currencies: {Currencies}. Next retry in {Delay}.",
            dayStartUtc,
            string.Join(',', remainingCodes),
            _retryDelay);

        return _retryDelay;
    }
}
