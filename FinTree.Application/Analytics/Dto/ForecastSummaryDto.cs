namespace FinTree.Application.Analytics.Dto;

public readonly record struct ForecastSummaryDto(
    decimal? OptimisticTotal,
    decimal? RiskTotal,
    decimal? MedianTotal,
    decimal? CurrentSpent,
    decimal? BaselineLimit,
    decimal? AvailableAmount);