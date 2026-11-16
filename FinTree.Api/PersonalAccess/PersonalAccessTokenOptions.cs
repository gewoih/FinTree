namespace FinTree.Api.PersonalAccess;

public static class PersonalAccessTokenDefaults
{
    public const string Scheme = "PersonalAccessToken";
    public const string SelectorScheme = "Smart";
    public const string TokenPrefix = "ftpat_";
    public const string AuthMethodClaim = "fintree:auth";
    public const string AuthMethodValue = "pat";
    public const string ScopeClaim = "fintree:scope";
}

public static class PersonalAccessScopes
{
    public const string Read = "read";
    public const string RetrospectiveWrite = "retro:write";
    public const string Notify = "notify";
}

/// <summary>
/// Личные токены для программного доступа (например, облачного советника).
/// Хранятся только SHA-256 хэши; источник — переменные окружения <c>PersonalAccess__Tokens__N__*</c>.
/// Все поля строковые: пустые переменные из compose не должны ронять биндинг.
/// </summary>
public sealed class PersonalAccessTokenOptions
{
    public List<PersonalAccessTokenEntry> Tokens { get; set; } = [];
}

public sealed class PersonalAccessTokenEntry
{
    public string? Name { get; set; }
    public string? TokenHash { get; set; }
    public string? UserId { get; set; }
    public List<string> Scopes { get; set; } = [];
}
