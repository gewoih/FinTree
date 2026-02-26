using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;

namespace FinTree.Application.Transactions;

internal readonly record struct TransactionAnalyticsSnapshot(
    Guid AccountId,
    Guid CategoryId,
    Money Money,
    DateTime OccurredAtUtc,
    TransactionType Type,
    bool IsTransfer,
    bool IsMandatory);
