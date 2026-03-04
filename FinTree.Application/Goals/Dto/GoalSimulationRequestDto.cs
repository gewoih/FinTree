namespace FinTree.Application.Goals.Dto;

public sealed record GoalSimulationRequestDto(
    decimal? InitialCapital,
    decimal? MonthlyIncome,
    decimal? MonthlyExpenses,
    decimal? AnnualReturnRate,
    int? HorizonMonths);
