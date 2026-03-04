namespace FinTree.Application.Goals.Dto;

public sealed record UpdateGoalDto(
    string Name,
    decimal TargetAmount,
    string? ParameterOverridesJson);
