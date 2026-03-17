namespace FinTree.Application.Analytics.Dto;

public readonly record struct FinancialHealthSummaryDto(
    decimal? MonthIncome,
    decimal? MonthTotal,
    decimal? MeanDaily,
    decimal? MedianDaily,
    decimal? StabilityIndex,
    int? StabilityScore,
    string? StabilityStatus,
    string? StabilityActionCode,
    bool StabilityIsPreview,
    decimal? SavingsRate,
    decimal? NetCashflow,
    decimal? DiscretionaryTotal,
    decimal? DiscretionarySharePercent,
    decimal? MonthOverMonthChangePercent,
    decimal? LiquidAssets,
    decimal? LiquidMonths,
    string? LiquidMonthsStatus,
    int? TotalMonthScore,
    int? TotalMonthScoreDeltaPoints,
    decimal? IncomeMonthOverMonthChangePercent,
    decimal? BalanceMonthOverMonthChangePercent);
