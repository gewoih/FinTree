namespace FinTree.Application.Analytics.Dto;

public sealed record EvolutionMonthDto(
    int Year,
    int Month,
    bool HasData,
    decimal? SavingsRate,
    decimal? DiscretionaryPercent,
    decimal? NetWorth,
    decimal? LiquidMonths,
    decimal? MeanDaily,
    int? TotalMonthScore
);
