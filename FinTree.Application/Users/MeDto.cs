namespace FinTree.Application.Users;

public record struct MeDto(
    Guid Id,
    string Name,
    string? Email,
    long? TelegramUserId,
    string BaseCurrencyCode,
    SubscriptionInfoDto Subscription);
