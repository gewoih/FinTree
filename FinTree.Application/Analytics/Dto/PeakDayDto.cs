namespace FinTree.Application.Analytics.Dto;

public readonly record struct PeakDayDto(
    int Year,
    int Month,
    int Day,
    decimal Amount,
    decimal? SharePercent);