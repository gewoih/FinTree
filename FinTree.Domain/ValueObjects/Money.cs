using System.ComponentModel.DataAnnotations.Schema;

namespace FinTree.Domain.ValueObjects;

[ComplexType]
public sealed record Money
{
    public string CurrencyCode { get; init; }
    public decimal Amount { get; init; }
    public Currency Currency => Currency.FromCode(CurrencyCode);
    
    private Money()
    {
    }

    public Money(string currencyCode, decimal amount)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(amount);
        ArgumentException.ThrowIfNullOrWhiteSpace(currencyCode);

        CurrencyCode = currencyCode;
        Amount = amount;
    }
}