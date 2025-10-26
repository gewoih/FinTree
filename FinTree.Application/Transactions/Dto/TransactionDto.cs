namespace FinTree.Application.Transactions.Dto;

public sealed record TransactionDto(
    Guid Id,
    Guid AccountId,
    decimal Amount,
    Guid CurrencyId,
    Guid CategoryId,
    string? Description,
    DateTime OccuredAt);