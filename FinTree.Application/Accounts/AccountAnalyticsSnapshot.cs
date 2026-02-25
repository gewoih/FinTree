namespace FinTree.Application.Accounts;

internal readonly record struct AccountAnalyticsSnapshot(
    Guid Id,
    string CurrencyCode,
    bool IsLiquid,
    bool IsArchived,
    DateTime CreatedAtUtc);

internal readonly record struct AccountAdjustmentAnalyticsSnapshot(
    Guid AccountId,
    decimal Amount,
    DateTime OccurredAtUtc);
