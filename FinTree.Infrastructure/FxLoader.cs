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
            var httpClient = httpClientFactory.CreateClient();
            var context = serviceProvider.CreateScope().ServiceProvider.GetRequiredService<AppDbContext>();

            var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));
            var dayStartUtc = targetDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var nextDayStartUtc = targetDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            var exists = await context.FxUsdRates
                .AnyAsync(r => r.EffectiveDate >= dayStartUtc && r.EffectiveDate < nextDayStartUtc, stoppingToken);

            if (exists)
            {
                await Task.Delay(_defaultDelay, stoppingToken);
                continue;
            }

            var currencies = Currency.All;
            var currencyCodes = string.Join(',', currencies.Select(c => c.Code));
            var url = string.Format(CultureInfo.InvariantCulture, UrlTemplate, _apiKey, currencyCodes);

            var result = await httpClient.GetAsync(url, stoppingToken);
            result.EnsureSuccessStatusCode();

            var content = await result.Content.ReadAsStringAsync(stoppingToken);
            var jObject = JObject.Parse(content);
            var rates = jObject["rates"].ToObject<Dictionary<string, decimal>>().ToList();
            var effectiveDate = DateTimeOffset.FromUnixTimeSeconds(jObject["timestamp"].ToObject<int>());

            var fxUsdRates = new List<FxUsdRate>();
            foreach (var (currencyCode, value) in rates)
            {
                fxUsdRates.Add(new FxUsdRate(currencyCode, effectiveDate.UtcDateTime, value));
            }

            await context.FxUsdRates.AddRangeAsync(fxUsdRates, stoppingToken);
            await context.SaveChangesAsync(stoppingToken);

            httpClient.Dispose();
            await context.DisposeAsync();

            await Task.Delay(_defaultDelay, stoppingToken);
        }
    }
}
