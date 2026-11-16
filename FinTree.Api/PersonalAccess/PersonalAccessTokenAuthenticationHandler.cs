using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace FinTree.Api.PersonalAccess;

public sealed class PersonalAccessTokenAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> schemeOptions,
    ILoggerFactory loggerFactory,
    UrlEncoder encoder,
    IOptionsMonitor<PersonalAccessTokenOptions> tokenOptions)
    : AuthenticationHandler<AuthenticationSchemeOptions>(schemeOptions, loggerFactory, encoder)
{
    private const string BearerPrefix = "Bearer ";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var token = ExtractToken(Request.Headers.Authorization.ToString());
        if (token is null)
            return Task.FromResult(AuthenticateResult.NoResult());

        var presentedHash = SHA256.HashData(Encoding.UTF8.GetBytes(token));

        foreach (var entry in tokenOptions.CurrentValue.Tokens)
        {
            if (!TryGetValidEntry(entry, out var storedHash, out var userId))
                continue;

            if (!CryptographicOperations.FixedTimeEquals(presentedHash, storedHash))
                continue;

            return Task.FromResult(AuthenticateResult.Success(CreateTicket(userId, entry.Scopes)));
        }

        return Task.FromResult(AuthenticateResult.Fail("invalid token"));
    }

    internal static bool IsPersonalAccessTokenHeader(string? authorizationHeader) =>
        ExtractToken(authorizationHeader) is not null;

    private static string? ExtractToken(string? authorizationHeader)
    {
        if (string.IsNullOrWhiteSpace(authorizationHeader) ||
            !authorizationHeader.StartsWith(BearerPrefix, StringComparison.OrdinalIgnoreCase))
            return null;

        var token = authorizationHeader[BearerPrefix.Length..].Trim();
        return token.StartsWith(PersonalAccessTokenDefaults.TokenPrefix, StringComparison.Ordinal) ? token : null;
    }

    private bool TryGetValidEntry(PersonalAccessTokenEntry entry, out byte[] storedHash, out Guid userId)
    {
        storedHash = [];
        userId = Guid.Empty;

        if (string.IsNullOrWhiteSpace(entry.TokenHash) && string.IsNullOrWhiteSpace(entry.UserId))
            return false; // запись не настроена — токены выключены

        if (!Guid.TryParse(entry.UserId, out userId) || userId == Guid.Empty)
        {
            Logger.LogWarning("Personal access token entry {Name} skipped: invalid UserId", entry.Name);
            return false;
        }

        try
        {
            storedHash = Convert.FromHexString(entry.TokenHash ?? string.Empty);
        }
        catch (FormatException)
        {
            storedHash = [];
        }

        if (storedHash.Length != SHA256.HashSizeInBytes)
        {
            Logger.LogWarning("Personal access token entry {Name} skipped: TokenHash is not SHA-256 hex", entry.Name);
            return false;
        }

        return true;
    }

    private AuthenticationTicket CreateTicket(Guid userId, IEnumerable<string> scopes)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(PersonalAccessTokenDefaults.AuthMethodClaim, PersonalAccessTokenDefaults.AuthMethodValue)
        };
        claims.AddRange(scopes
            .Where(scope => !string.IsNullOrWhiteSpace(scope))
            .Select(scope => new Claim(PersonalAccessTokenDefaults.ScopeClaim, scope.Trim())));

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        return new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name);
    }
}
