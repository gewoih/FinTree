namespace FinTree.Application.Transactions;

public sealed record TransactionDto(
    Guid Id,
    decimal Amount,
    string Currency,
    Guid? CategoryId,
    string? Description,
    DateOnly OccuredAt);