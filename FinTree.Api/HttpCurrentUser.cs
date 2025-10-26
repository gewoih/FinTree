using System.Security.Claims;
using FinTree.Application.Identity;

namespace FinTree.Api;

public sealed class HttpCurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public Guid Id => new("e8f7ff88-d7f9-4f7a-a7ce-dae7e191c89c");
    // Guid.TryParse(httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
    //     ? id
    //     : Guid.Empty;
}