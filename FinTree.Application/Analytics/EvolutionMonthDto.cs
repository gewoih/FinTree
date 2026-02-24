namespace FinTree.Application.Analytics;

public sealed record EvolutionMonthDto(
    int Year,
    int Month,
    bool HasData,
    decimal? SavingsRate,
    decimal? StabilityIndex,
    decimal? DiscretionaryPercent,
    decimal? NetWorth,
    decimal? LiquidMonths,
    decimal? MeanDaily,
    decimal? PeakDayRatio
);
