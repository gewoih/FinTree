using FinTree.Domain.Subscriptions;

namespace FinTree.Application.Users;

public readonly record struct SubscriptionPaymentDto(
    Guid Id,
    SubscriptionPlan Plan,
    SubscriptionPaymentStatus Status,
    decimal ListedPriceRub,
    decimal ChargedPriceRub,
    int BillingPeriodMonths,
    int GrantedMonths,
    bool IsSimulation,
    DateTime PaidAtUtc,
    DateTime SubscriptionStartsAtUtc,
    DateTime SubscriptionEndsAtUtc,
    string? Provider,
    string? ExternalPaymentId);
