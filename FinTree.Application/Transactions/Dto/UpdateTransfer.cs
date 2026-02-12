using System.ComponentModel.DataAnnotations;

namespace FinTree.Application.Transactions.Dto;

public readonly record struct UpdateTransfer(
    Guid TransferId,
    Guid FromAccountId,
    Guid ToAccountId,
    decimal FromAmount,
    decimal ToAmount,
    DateTime OccurredAt,
    decimal? FeeAmount = null,
    [property: StringLength(100)]
    string? Description = null);
