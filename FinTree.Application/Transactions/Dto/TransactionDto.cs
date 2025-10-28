using FinTree.Domain.ValueObjects;

namespace FinTree.Application.Transactions.Dto;

public sealed record TransactionDto(
    Guid Id,
    Guid AccountId,
    Money Money,
    Guid CategoryId,
    string? Description,
    DateTime OccuredAt);