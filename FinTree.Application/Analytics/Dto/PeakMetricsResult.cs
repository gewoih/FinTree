namespace FinTree.Application.Analytics.Dto;

public readonly record struct PeakMetricsResult(
    PeakDaysSummaryDto Summary,
    IReadOnlyList<PeakDayDto> Days,
    decimal? PeakSpendSharePercent,
    decimal? PeakDayRatioPercent);