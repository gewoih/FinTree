using FinTree.Domain;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Dto;

public record struct CreateTransaction(
    TransactionType Type,
    Guid AccountId,
    decimal Amount,
    DateTime OccurredAt,
    Guid CategoryId,
    string? Description = null,
    bool IsMandatory = false);