namespace FinTree.Application.Analytics.Dto;

public readonly record struct ForecastSeriesDto(
    IReadOnlyList<int> Days,
    IReadOnlyList<decimal?> Actual,
    decimal? Baseline);