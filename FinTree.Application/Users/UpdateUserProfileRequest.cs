namespace FinTree.Application.Users;

public readonly record struct UpdateUserProfileRequest(string BaseCurrencyCode, long? TelegramUserId);
