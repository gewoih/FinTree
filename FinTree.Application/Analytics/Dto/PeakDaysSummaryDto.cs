namespace FinTree.Application.Analytics.Dto;

public readonly record struct PeakDaysSummaryDto(
    int Count,
    decimal Total,
    decimal? SharePercent,
    decimal? MonthTotal);