using FinTree.Domain.IncomeStreams;

namespace FinTree.Application.IncomeInstruments;

public readonly record struct CreateIncomeInstrument(
    string Name,
    string CurrencyCode,
    IncomeInstrumentType Type,
    decimal PrincipalAmount,
    decimal ExpectedAnnualYieldRate,
    decimal? MonthlyContribution,
    string? Notes);
