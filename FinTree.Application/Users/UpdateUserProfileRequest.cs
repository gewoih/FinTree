using System.ComponentModel.DataAnnotations;

namespace FinTree.Application.Users;

public readonly record struct UpdateUserProfileRequest(
    [Required] string BaseCurrencyCode,
    long? TelegramUserId);
