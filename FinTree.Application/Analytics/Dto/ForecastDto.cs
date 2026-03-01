namespace FinTree.Application.Analytics.Dto;

public readonly record struct ForecastDto(
    ForecastSummaryDto Summary,
    ForecastSeriesDto Series);