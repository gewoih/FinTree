using System.Security.Claims;
using System.Text.Json;
using FinTree.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Api;

public sealed class SubscriptionWriteAccessMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IAppDbContext dbContext)
    {
        if (ShouldSkipCheck(context))
        {
            await next(context);
            return;
        }

        var userIdRaw = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            await next(context);
            return;
        }

        var subscriptionExpiresAtUtc = await dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => u.SubscriptionExpiresAtUtc)
            .SingleOrDefaultAsync(context.RequestAborted);

        if (subscriptionExpiresAtUtc is { } expiresAtUtc && expiresAtUtc > DateTime.UtcNow)
        {
            await next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/json";

        var payload = JsonSerializer.Serialize(new
        {
            error = "Подписка неактивна. Для изменения данных нажмите «Оплатить».",
            code = "subscription_required",
            details = new
            {
                expiresAtUtc = subscriptionExpiresAtUtc
            }
        });

        await context.Response.WriteAsync(payload, context.RequestAborted);
    }

    private static bool ShouldSkipCheck(HttpContext context)
    {
        var method = context.Request.Method;
        if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method))
            return true;

        var path = context.Request.Path.Value ?? string.Empty;
        if (!path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
            return true;

        if (path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase))
            return true;

        if (path.Equals("/api/users/subscription/pay", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/users/subscription/pay/", StringComparison.OrdinalIgnoreCase))
            return true;

        if (context.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>() is not null)
            return true;

        return context.User.Identity?.IsAuthenticated != true;
    }
}
