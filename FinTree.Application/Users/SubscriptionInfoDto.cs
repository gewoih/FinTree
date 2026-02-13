namespace FinTree.Application.Users;

public readonly record struct SubscriptionInfoDto(
    bool IsActive,
    bool IsReadOnlyMode,
    DateTime? ExpiresAtUtc,
    decimal MonthPriceRub,
    decimal YearPriceRub);
