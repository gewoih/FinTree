using FinTree.Domain.IncomeStreams;

namespace FinTree.Application.Analytics;

public sealed record IncomeBreakdownDto(
    string Label,
    decimal MonthlyAmount,
    decimal AnnualAmount,
    decimal Share);

public sealed record SalaryProjectionDto(
    decimal MonthlyAverage,
    decimal AnnualProjection,
    IReadOnlyList<IncomeBreakdownDto> Sources);

public sealed record IncomeInstrumentProjectionDto(
    Guid Id,
    string Name,
    IncomeInstrumentType Type,
    string OriginalCurrencyCode,
    decimal PrincipalAmount,
    decimal ExpectedAnnualYieldRate,
    decimal? MonthlyContribution,
    decimal ExpectedMonthlyIncome,
    decimal ExpectedAnnualIncome,
    decimal PrincipalAmountInBaseCurrency,
    decimal? MonthlyContributionInBaseCurrency,
    decimal ExpectedMonthlyIncomeInBaseCurrency,
    decimal ExpectedAnnualIncomeInBaseCurrency);

public sealed record FutureIncomeOverviewDto(
    string BaseCurrencyCode,
    SalaryProjectionDto? Salary,
    IReadOnlyList<IncomeInstrumentProjectionDto> Instruments,
    decimal TotalExpectedMonthlyIncome,
    decimal TotalExpectedAnnualIncome);
