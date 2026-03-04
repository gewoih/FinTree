using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Base;

namespace FinTree.Domain.Goals;

public sealed class Goal : Entity
{
    [MaxLength(100)]
    public string Name { get; private set; } = string.Empty;

    public Guid UserId { get; private set; }

    public decimal TargetAmount { get; private set; }

    [MaxLength(3)]
    public string CurrencyCode { get; private set; } = string.Empty;

    public string? ParameterOverridesJson { get; private set; }

    private Goal()
    {
    }

    internal Goal(Guid userId, string name, decimal targetAmount, string currencyCode)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(targetAmount);
        ArgumentException.ThrowIfNullOrWhiteSpace(currencyCode);

        UserId = userId;
        Name = name.Trim();
        TargetAmount = targetAmount;
        CurrencyCode = currencyCode.Trim().ToUpperInvariant();
    }

    public static Goal Create(Guid userId, string name, decimal targetAmount, string currencyCode)
        => new(userId, name, targetAmount, currencyCode);

    public void UpdateDetails(string name, decimal targetAmount, string? parameterOverridesJson)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(targetAmount);

        Name = name.Trim();
        TargetAmount = targetAmount;
        ParameterOverridesJson = string.IsNullOrWhiteSpace(parameterOverridesJson)
            ? null
            : parameterOverridesJson.Trim();
    }
}
