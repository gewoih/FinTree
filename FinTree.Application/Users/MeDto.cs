namespace FinTree.Application.Users;

public record struct MeDto(
    Guid Id,
    string? Email,
    long? TelegramUserId,
    string BaseCurrencyCode);
