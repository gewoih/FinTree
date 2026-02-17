namespace FinTree.Application.Users;

public record struct MeDto(
    Guid Id,
    string Name,
    string? Email,
    long? TelegramUserId,
    bool RegisteredViaTelegram,
    string BaseCurrencyCode,
    SubscriptionInfoDto Subscription,
    bool OnboardingCompleted,
    bool OnboardingSkipped);
