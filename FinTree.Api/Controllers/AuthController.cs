using FinTree.Application.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace FinTree.Api.Controllers;

[AllowAnonymous]
[Route("api/[controller]")]
[ApiController]
public class AuthController(
    AuthService authService,
    IOptions<AuthOptions> authOptionsAccessor,
    IWebHostEnvironment environment) : ControllerBase
{
    private readonly AuthOptions _authOptions = authOptionsAccessor.Value;

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var response = await authService.RegisterAsync(request, ct);
        SetAuthCookie(response.Token);
        return Ok(new AuthPublicResponse(response.Email, response.UserId));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var response = await authService.LoginAsync(request, ct);
        SetAuthCookie(response.Token);
        return Ok(new AuthPublicResponse(response.Email, response.UserId));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        ClearAuthCookie();
        return Ok();
    }

    private void SetAuthCookie(string token)
    {
        var options = BuildAuthCookieOptions();
        Response.Cookies.Append(AuthConstants.AuthCookieName, token, options);
    }

    private void ClearAuthCookie()
    {
        var options = BuildDeleteCookieOptions();
        Response.Cookies.Delete(AuthConstants.AuthCookieName, options);
    }

    private CookieOptions BuildAuthCookieOptions()
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddDays(_authOptions.TokenLifetimeDays)
        };
    }

    private CookieOptions BuildDeleteCookieOptions()
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = "/"
        };
    }
}
