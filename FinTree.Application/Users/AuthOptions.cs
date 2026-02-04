namespace FinTree.Application.Users;

public sealed class AuthOptions
{
    public string? JwtSecretKey { get; set; }
    public string? Issuer { get; set; }
    public string? Audience { get; set; }
    public int TokenLifetimeDays { get; set; }
}
