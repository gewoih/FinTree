namespace FinTree.Application.Users;

public readonly record struct AuthResponse(
    string Token,
    string Email,
    Guid UserId
);
