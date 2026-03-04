namespace FinTree.Application.Goals.Dto;

public sealed record GoalDto(
    Guid Id,
    string Name,
    decimal TargetAmount,
    string CurrencyCode,
    string? ParameterOverridesJson,
    DateTimeOffset CreatedAt);
