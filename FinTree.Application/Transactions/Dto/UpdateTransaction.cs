using System.ComponentModel.DataAnnotations;

namespace FinTree.Application.Transactions.Dto;

public record struct UpdateTransaction(
    Guid Id,
    Guid AccountId,
    Guid CategoryId,
    decimal Amount,
    DateTime OccurredAt,
    [property: StringLength(100)]
    string? Description = null,
    bool IsMandatory = false);
