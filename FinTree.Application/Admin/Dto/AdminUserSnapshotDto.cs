namespace FinTree.Application.Admin.Dto;

public readonly record struct AdminUserSnapshotDto(
    Guid UserId,
    string? Email,
    string Name,
    bool IsOwner,
    bool HasActiveSubscription,
    bool IsOnboardingCompleted,
    bool IsTelegramLinked,
    int TransactionsCount,
    DateTime? LastTransactionAtUtc
);
