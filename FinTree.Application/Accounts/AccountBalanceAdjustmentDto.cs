namespace FinTree.Application.Accounts;

public sealed record AccountBalanceAdjustmentDto(
    Guid Id,
    Guid AccountId,
    decimal Amount,
    DateTime OccurredAt);
