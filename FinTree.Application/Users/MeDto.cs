namespace FinTree.Application.Users;

public record struct MeDto(
    Guid Id,
    string Name,
    string? Email,
    string? TelegramUsername,
    string BaseCurrencyCode);