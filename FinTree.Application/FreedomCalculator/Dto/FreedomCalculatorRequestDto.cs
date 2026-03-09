namespace FinTree.Application.FreedomCalculator.Dto;

public sealed record FreedomCalculatorRequestDto(
    decimal Capital,
    decimal MonthlyExpenses,
    decimal SwrPercent,
    decimal InflationRatePercent,
    bool InflationEnabled);
