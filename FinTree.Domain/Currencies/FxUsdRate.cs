namespace FinTree.Domain.Currencies;

public sealed class FxUsdRate
{
    public Guid Id { get; private set; }
    public string CurrencyCode { get; private set; }
    public DateTime EffectiveDate { get; private set; }
    public decimal Rate { get; private set; }

    public FxUsdRate(string currencyCode, DateTime effectiveDate, decimal rate)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(currencyCode, nameof(currencyCode));
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(rate, nameof(rate));
        
        CurrencyCode = currencyCode;
        EffectiveDate = effectiveDate;
        Rate = rate;
    }
}