namespace FinTree.Application.Goals.Dto;

public sealed record CreateGoalDto(
    string Name,
    decimal TargetAmount,
    string CurrencyCode);
