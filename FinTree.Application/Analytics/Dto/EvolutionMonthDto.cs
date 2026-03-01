namespace FinTree.Application.Analytics.Dto;

public sealed record EvolutionMonthDto(
    int Year,
    int Month,
    bool HasData,
    decimal? SavingsRate,
    decimal? StabilityIndex,
    int? StabilityScore,
    string? StabilityStatus,
    string? StabilityActionCode,
    decimal? DiscretionaryPercent,
    decimal? NetWorth,
    decimal? LiquidMonths,
    decimal? MeanDaily,
    decimal? PeakDayRatio,
    decimal? PeakSpendSharePercent,
    int? TotalMonthScore
);
