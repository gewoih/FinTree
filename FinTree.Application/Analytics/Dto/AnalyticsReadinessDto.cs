namespace FinTree.Application.Analytics.Dto;

public readonly record struct AnalyticsReadinessDto(
    bool HasForecastData,
    int ObservedExpenseDays,
    int RequiredExpenseDays);
