using System.Text.Json.Serialization;

namespace FinTree.Application.Users;

public readonly record struct TelegramLoginRequest(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("auth_date")] long AuthDate,
    [property: JsonPropertyName("hash")] string Hash,
    [property: JsonPropertyName("first_name")] string? FirstName,
    [property: JsonPropertyName("last_name")] string? LastName,
    [property: JsonPropertyName("username")] string? Username,
    [property: JsonPropertyName("photo_url")] string? PhotoUrl
);
