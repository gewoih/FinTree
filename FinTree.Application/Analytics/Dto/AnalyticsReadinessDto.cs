namespace FinTree.Application.Analytics.Dto;

public readonly record struct AnalyticsReadinessDto(
    bool HasForecastAndStabilityData,
    int ObservedExpenseDays,
    int RequiredExpenseDays,
    bool HasStabilityDataForSelectedMonth,
    int ObservedStabilityDaysInSelectedMonth,
    int RequiredStabilityDays);