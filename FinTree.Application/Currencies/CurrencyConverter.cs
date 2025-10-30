using FinTree.Domain.ValueObjects;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FinTree.Application.Currencies;

public sealed class CurrencyConverter(AppDbContext context, IMemoryCache cache)
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);

    public async Task<decimal> ConvertAsync(Money money, string toCurrencyCode, DateTime atUtc,
        CancellationToken ct = default)
    {
        var rate = await GetCrossRateAsync(money.Currency.Code, toCurrencyCode, atUtc, ct);
        return money.Amount * rate;
    }

    private async Task<decimal> GetCrossRateAsync(string fromCurrency, string toCurrency, DateTime atUtc,
        CancellationToken ct = default)
    {
        var from = Normalize(fromCurrency);
        var to = Normalize(toCurrency);

        if (from == to)
            return 1m;

        var d = atUtc.Date;

        var fromUnitsPerUsd = await GetUnitsPerUsdAsync(from, d, ct);
        var toUnitsPerUsd = await GetUnitsPerUsdAsync(to, d, ct);

        return toUnitsPerUsd / fromUnitsPerUsd;
    }

    private async Task<decimal> GetUnitsPerUsdAsync(string currency, DateTime dateUtc, CancellationToken ct)
    {
        if (currency == "USD")
            return 1m;

        var key = (currency, dateUtc);

        if (cache.TryGetValue(key, out decimal cached))
            return cached;

        var rate = await context.FxUsdRates
            .Where(r => r.CurrencyCode == currency && r.EffectiveDate <= dateUtc)
            .OrderByDescending(r => r.EffectiveDate)
            .Select(r => (decimal?)r.Rate)
            .FirstOrDefaultAsync(ct);

        if (rate is null)
            throw new InvalidOperationException();

        cache.Set(key, rate.Value, CacheTtl);
        return rate.Value;
    }

    private static string Normalize(string code)
        => string.IsNullOrWhiteSpace(code)
            ? throw new ArgumentException("Код валюты пустой", nameof(code))
            : code.Trim().ToUpperInvariant();
}