namespace FinTree.Application.Goals.Dto;

public sealed record GoalSimulationRequestDto(
    decimal TargetAmount,
    decimal? InitialCapital,
    decimal? MonthlyIncome,
    decimal? MonthlyExpenses,
    decimal? AnnualReturnRate);
