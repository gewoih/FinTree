using System.ComponentModel.DataAnnotations.Schema;

namespace FinTree.Domain.ValueObjects;

[ComplexType]
public sealed record Money
{
    [NotMapped] public Currency Currency { get; init; }
    public decimal Amount { get; init; }

    private Money()
    {
    }

    public Money(string currencyCode, decimal amount)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(amount);

        Currency = Currency.FromCode(currencyCode);
        Amount = amount;
    }
}