namespace FinTree.Application.FreedomCalculator.Dto;

public sealed record FreedomCalculatorResultDto(
    int FreeDaysPerYear,
    decimal PercentToFi,
    decimal AnnualPassiveIncome,
    decimal AnnualEffectiveExpenses);
