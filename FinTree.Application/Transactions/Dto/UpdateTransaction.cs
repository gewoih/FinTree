namespace FinTree.Application.Transactions.Dto;

public record struct UpdateTransaction(
    Guid Id,
    Guid AccountId,
    Guid CategoryId,
    decimal Amount,
    DateTime OccurredAt,
    string? Description = null,
    bool IsMandatory = false);
