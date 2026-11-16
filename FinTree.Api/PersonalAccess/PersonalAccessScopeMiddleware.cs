using System.Text.Json;
using System.Text.RegularExpressions;

namespace FinTree.Api.PersonalAccess;

/// <summary>
/// Запросы с личным токеном пропускаются только по белому списку (метод + путь + scope).
/// Остальные запросы (cookie/JWT) не затрагиваются.
/// </summary>
public sealed partial class PersonalAccessScopeMiddleware(RequestDelegate next)
{
    private sealed record Rule(string Method, Regex Path, string Scope);

    private static readonly Rule[] Rules =
    [
        new(HttpMethods.Get, TransactionsPath(), PersonalAccessScopes.Read),
        new(HttpMethods.Get, UserReadPath(), PersonalAccessScopes.Read),
        new(HttpMethods.Get, AnalyticsPath(), PersonalAccessScopes.Read),
        new(HttpMethods.Get, RetrospectivesReadPath(), PersonalAccessScopes.Read),
        new(HttpMethods.Post, RetrospectivesCollectionPath(), PersonalAccessScopes.RetrospectiveWrite),
        new(HttpMethods.Put, RetrospectiveMonthPath(), PersonalAccessScopes.RetrospectiveWrite),
        new(HttpMethods.Post, NotifyPath(), PersonalAccessScopes.Notify)
    ];

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.User.HasClaim(PersonalAccessTokenDefaults.AuthMethodClaim, PersonalAccessTokenDefaults.AuthMethodValue) ||
            IsAllowed(context))
        {
            await next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/json";
        var payload = JsonSerializer.Serialize(new
        {
            error = "Токен не даёт доступа к этому действию.",
            code = "pat_forbidden"
        });
        await context.Response.WriteAsync(payload, context.RequestAborted);
    }

    private static bool IsAllowed(HttpContext context)
    {
        var method = context.Request.Method;
        var path = context.Request.Path.Value ?? string.Empty;

        return Rules.Any(rule =>
            string.Equals(rule.Method, method, StringComparison.OrdinalIgnoreCase) &&
            rule.Path.IsMatch(path) &&
            context.User.HasClaim(PersonalAccessTokenDefaults.ScopeClaim, rule.Scope));
    }

    [GeneratedRegex("^/api/transaction$", RegexOptions.IgnoreCase)]
    private static partial Regex TransactionsPath();

    [GeneratedRegex("^/api/users/(me|accounts|categories)$", RegexOptions.IgnoreCase)]
    private static partial Regex UserReadPath();

    [GeneratedRegex("^/api/analytics/(dashboard|net-worth|evolution)$", RegexOptions.IgnoreCase)]
    private static partial Regex AnalyticsPath();

    [GeneratedRegex("^/api/retrospectives(/.*)?$", RegexOptions.IgnoreCase)]
    private static partial Regex RetrospectivesReadPath();

    [GeneratedRegex("^/api/retrospectives$", RegexOptions.IgnoreCase)]
    private static partial Regex RetrospectivesCollectionPath();

    [GeneratedRegex(@"^/api/retrospectives/\d{4}-\d{2}$", RegexOptions.IgnoreCase)]
    private static partial Regex RetrospectiveMonthPath();

    [GeneratedRegex("^/api/users/me/notify$", RegexOptions.IgnoreCase)]
    private static partial Regex NotifyPath();
}
