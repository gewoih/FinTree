namespace FinTree.Application.Transactions.Dto;

public readonly record struct CreateTransfer(
    Guid FromAccountId,
    Guid ToAccountId,
    decimal FromAmount,
    decimal ToAmount,
    DateTime OccurredAt,
    decimal? FeeAmount = null,
    string? Description = null);
