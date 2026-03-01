namespace FinTree.Application.Analytics.Dto;

public readonly record struct AnalyticsDashboardDto(
    int Year,
    int Month,
    FinancialHealthSummaryDto Health,
    PeakDaysSummaryDto Peaks,
    IReadOnlyList<PeakDayDto> PeakDays,
    CategoryBreakdownDto Categories,
    CategoryBreakdownDto IncomeCategories,
    SpendingBreakdownDto Spending,
    ForecastDto Forecast,
    AnalyticsReadinessDto Readiness);