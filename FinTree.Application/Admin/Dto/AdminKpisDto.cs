namespace FinTree.Application.Admin.Dto;

public readonly record struct AdminKpisDto(
    int TotalUsers,
    int ActiveSubscriptions,
    decimal ActiveSubscriptionsRatePercent,
    int OnboardingCompletedUsers,
    decimal OnboardingCompletionRatePercent,
    int TotalAccounts,
    int TotalTransactions,
    int TransactionsLast30Days
);
