using FinTree.Domain.Categories;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Transactions.Dto;

public record struct CreateTransaction(
    CategoryType Type,
    Guid AccountId,
    decimal Amount,
    DateTime OccurredAt,
    Guid CategoryId,
    string? Description = null,
    bool IsMandatory = false);