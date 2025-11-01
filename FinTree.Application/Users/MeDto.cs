namespace FinTree.Application.Users;

public record struct MeDto(
    Guid Id,
    string? Email,
    string? TelegramUsername,
    string BaseCurrencyCode);