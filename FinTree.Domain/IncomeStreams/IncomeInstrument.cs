using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FinTree.Domain.Base;
using FinTree.Domain.Identity;
using FinTree.Domain.ValueObjects;

namespace FinTree.Domain.IncomeStreams;

public sealed class IncomeInstrument : Entity
{
    [MaxLength(120)] public string Name { get; private set; }

    public Guid UserId { get; private set; }
    public User User { get; private set; }

    [MaxLength(3)] public string CurrencyCode { get; private set; }
    [NotMapped] public Currency Currency => Currency.FromCode(CurrencyCode);

    public IncomeInstrumentType InstrumentType { get; private set; }

    [Column(TypeName = "numeric(18,2)")]
    public decimal PrincipalAmount { get; private set; }

    [Column(TypeName = "numeric(6,4)")]
    public decimal ExpectedAnnualYieldRate { get; private set; }

    [Column(TypeName = "numeric(18,2)")]
    public decimal? MonthlyContribution { get; private set; }

    [MaxLength(500)] public string? Notes { get; private set; }

    private IncomeInstrument()
    {
    }

    internal IncomeInstrument(Guid userId, string name, string currencyCode, IncomeInstrumentType instrumentType,
        decimal principalAmount, decimal expectedAnnualYieldRate, decimal? monthlyContribution, string? notes)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty, nameof(userId));
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        ArgumentException.ThrowIfNullOrWhiteSpace(currencyCode, nameof(currencyCode));

        if (principalAmount <= 0)
            throw new ArgumentOutOfRangeException(nameof(principalAmount), "Principal amount must be positive.");

        if (expectedAnnualYieldRate < 0 || expectedAnnualYieldRate > 5)
            throw new ArgumentOutOfRangeException(nameof(expectedAnnualYieldRate),
                "Expected annual yield rate must be between 0 and 5 (0% - 500%).");

        if (monthlyContribution is < 0)
            throw new ArgumentOutOfRangeException(nameof(monthlyContribution),
                "Monthly contribution cannot be negative.");

        UserId = userId;
        Name = name.Trim();
        CurrencyCode = currencyCode.Trim().ToUpperInvariant();
        InstrumentType = instrumentType;
        PrincipalAmount = Math.Round(principalAmount, 2, MidpointRounding.AwayFromZero);
        ExpectedAnnualYieldRate = Math.Round(expectedAnnualYieldRate, 4, MidpointRounding.AwayFromZero);
        MonthlyContribution = monthlyContribution is null
            ? null
            : Math.Round(monthlyContribution.Value, 2, MidpointRounding.AwayFromZero);
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
    }

    public decimal CalculateExpectedAnnualIncome()
        => PrincipalAmount * ExpectedAnnualYieldRate + (MonthlyContribution ?? 0m) * 12m;

    public decimal CalculateExpectedMonthlyIncome()
        => CalculateExpectedAnnualIncome() / 12m;
}
