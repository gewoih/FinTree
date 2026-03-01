namespace FinTree.Application.Analytics.Dto;

public readonly record struct ForecastSeriesDto(
    IReadOnlyList<int> Days,
    IReadOnlyList<decimal?> Actual,
    IReadOnlyList<decimal?> Optimistic,
    IReadOnlyList<decimal?> Risk,
    decimal? Baseline);