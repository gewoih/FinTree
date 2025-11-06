using FinTree.Domain.IncomeStreams;

namespace FinTree.Application.IncomeInstruments;

public readonly record struct IncomeInstrumentDto(
    Guid Id,
    string Name,
    string CurrencyCode,
    IncomeInstrumentType Type,
    decimal PrincipalAmount,
    decimal ExpectedAnnualYieldRate,
    decimal? MonthlyContribution,
    string? Notes,
    DateTimeOffset CreatedAt);
