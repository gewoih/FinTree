using FinTree.Application.Abstractions;
using FinTree.Domain.ValueObjects;
using FinTree.Application.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FinTree.Application.Currencies;

public sealed class CurrencyConverter(IAppDbContext context, IMemoryCache cache)
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);

    public async Task<Money> ConvertAsync(Money money, string toCurrencyCode, DateTime atUtc, CancellationToken ct)
    {
        var rate = await GetCrossRateAsync(money.Currency.Code, toCurrencyCode, atUtc, ct);
        return new Money(toCurrencyCode, money.Amount * rate);
    }

    public async Task<Dictionary<(string CurrencyCode, DateTime DayStartUtc), decimal>> GetCrossRatesAsync(
        IEnumerable<(string CurrencyCode, DateTime AtUtc)> requests,
        string toCurrencyCode,
        CancellationToken ct = default)
    {
        var normalizedRequests = requests
            .Select(request => (Normalize(request.CurrencyCode), NormalizeDayStartUtc(request.AtUtc)))
            .Distinct()
            .ToList();

        var rates = new Dictionary<(string CurrencyCode, DateTime DayStartUtc), decimal>(normalizedRequests.Count);
        foreach (var request in normalizedRequests)
        {
            ct.ThrowIfCancellationRequested();
            var rate = await GetCrossRateAsync(request.Item1, toCurrencyCode, request.Item2, ct);
            rates[request] = rate;
        }

        return rates;
    }

    private async Task<decimal> GetCrossRateAsync(string fromCurrency, string toCurrency, DateTime atUtc,
        CancellationToken ct = default)
    {
        var from = Normalize(fromCurrency);
        var to = Normalize(toCurrency);

        if (from == to)
            return 1m;

        var requestedAtUtc = atUtc.Kind switch
        {
            DateTimeKind.Utc => atUtc,
            DateTimeKind.Unspecified => DateTime.SpecifyKind(atUtc, DateTimeKind.Utc),
            _ => atUtc.ToUniversalTime()
        };
        var requestedDayStartUtc = requestedAtUtc.Date;

        var fromUnitsPerUsd = await GetUnitsPerUsdAsync(from, requestedDayStartUtc, ct);
        var toUnitsPerUsd = await GetUnitsPerUsdAsync(to, requestedDayStartUtc, ct);

        return toUnitsPerUsd / fromUnitsPerUsd;
    }

    private async Task<decimal> GetUnitsPerUsdAsync(string currency, DateTime dateUtc, CancellationToken ct)
    {
        if (currency == "USD")
            return 1m;

        var dayStartUtc = DateTime.SpecifyKind(dateUtc.Date, DateTimeKind.Utc);
        var dayEndUtcExclusive = dayStartUtc.AddDays(1);
        var key = (currency, dayStartUtc);

        if (cache.TryGetValue(key, out decimal cached))
            return cached;

        var rate = await context.FxUsdRates
            .Where(r => r.CurrencyCode == currency && r.EffectiveDate < dayEndUtcExclusive)
            .OrderByDescending(r => r.EffectiveDate)
            .Select(r => (decimal?)r.Rate)
            .FirstOrDefaultAsync(ct);

        if (rate is null)
        {
            rate = await context.FxUsdRates
                .Where(r => r.CurrencyCode == currency)
                .OrderBy(r => r.EffectiveDate)
                .Select(r => (decimal?)r.Rate)
                .FirstOrDefaultAsync(ct);
        }

        if (rate is null)
            throw new DomainValidationException(
                $"Курс валюты {currency} не найден.",
                "fx_rate_not_found",
                new { currency, requestedAt = dayStartUtc });

        cache.Set(key, rate.Value, CacheTtl);
        return rate.Value;
    }

    private static string Normalize(string code)
        => string.IsNullOrWhiteSpace(code)
            ? throw new ArgumentException("Код валюты пустой", nameof(code))
            : code.Trim().ToUpperInvariant();

    private static DateTime NormalizeDayStartUtc(DateTime value)
    {
        var utcValue = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
            _ => value.ToUniversalTime()
        };

        return utcValue.Date;
    }
}
