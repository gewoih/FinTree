using FinTree.Application.Currencies;

namespace FinTree.Application.Analytics;

public readonly record struct AnalyticsDashboardDto(
    int Year,
    int Month,
    FinancialHealthSummaryDto Health,
    PeakDaysSummaryDto Peaks,
    IReadOnlyList<PeakDayDto> PeakDays,
    CategoryBreakdownDto Categories,
    SpendingBreakdownDto Spending,
    ForecastDto Forecast);

public readonly record struct FinancialHealthSummaryDto(
    decimal? MonthTotal,
    decimal? MeanDaily,
    decimal? MedianDaily,
    decimal? SavingsRate,
    decimal? NetCashflow,
    decimal? DiscretionaryTotal,
    decimal? DiscretionarySharePercent,
    decimal? MonthOverMonthChangePercent);

public readonly record struct PeakDaysSummaryDto(
    int Count,
    decimal Total,
    decimal? SharePercent,
    decimal? MonthTotal);

public readonly record struct PeakDayDto(
    int Year,
    int Month,
    int Day,
    decimal Amount,
    decimal? SharePercent);

public readonly record struct CategoryBreakdownDto(
    IReadOnlyList<CategoryBreakdownItemDto> Items,
    CategoryDeltaDto Delta);

public readonly record struct CategoryBreakdownItemDto(
    Guid Id,
    string Name,
    string Color,
    decimal Amount,
    decimal? Percent,
    bool IsMandatory);

public readonly record struct CategoryDeltaDto(
    IReadOnlyList<CategoryDeltaItemDto> Increased,
    IReadOnlyList<CategoryDeltaItemDto> Decreased);

public readonly record struct CategoryDeltaItemDto(
    Guid Id,
    string Name,
    string Color,
    decimal CurrentAmount,
    decimal PreviousAmount,
    decimal DeltaAmount,
    decimal? DeltaPercent);

public readonly record struct SpendingBreakdownDto(
    IReadOnlyList<MonthlyExpensesDto> Days,
    IReadOnlyList<MonthlyExpensesDto> Weeks,
    IReadOnlyList<MonthlyExpensesDto> Months);

public readonly record struct ForecastDto(
    ForecastSummaryDto Summary,
    ForecastSeriesDto Series);

public readonly record struct ForecastSummaryDto(
    decimal? ForecastTotal,
    decimal? CurrentSpent,
    decimal? BaselineLimit,
    string? Status);

public readonly record struct ForecastSeriesDto(
    IReadOnlyList<int> Days,
    IReadOnlyList<decimal?> Actual,
    IReadOnlyList<decimal?> Forecast,
    IReadOnlyList<decimal?> Baseline);
