namespace FinTree.Application.Users;

public readonly record struct AuthResponse(
    string AccessToken,
    string RefreshToken,
    string Email,
    Guid UserId
);
