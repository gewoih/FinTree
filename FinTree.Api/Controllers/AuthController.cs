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
        SetAuthCookies(response.AccessToken, response.RefreshToken);
        return Ok(new AuthPublicResponse(response.Email, response.UserId));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var response = await authService.LoginAsync(request, ct);
        SetAuthCookies(response.AccessToken, response.RefreshToken);
        return Ok(new AuthPublicResponse(response.Email, response.UserId));
    }

    [HttpPost("telegram")]
    public async Task<IActionResult> TelegramLogin([FromBody] TelegramLoginRequest request, CancellationToken ct)
    {
        var response = await authService.LoginWithTelegramAsync(request, ct);
        SetAuthCookies(response.AccessToken, response.RefreshToken);
        return Ok(new AuthPublicResponse(response.Email, response.UserId));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var refreshToken = Request.Cookies[AuthConstants.RefreshTokenCookieName];
        var response = await authService.RefreshAsync(refreshToken ?? string.Empty, ct);
        SetAuthCookies(response.AccessToken, response.RefreshToken);
        return Ok(new AuthPublicResponse(response.Email, response.UserId));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var refreshToken = Request.Cookies[AuthConstants.RefreshTokenCookieName];
        await authService.RevokeRefreshTokenAsync(refreshToken, ct);
        ClearAuthCookies();
        return Ok();
    }

    private void SetAuthCookies(string accessToken, string refreshToken)
    {
        Response.Cookies.Append(AuthConstants.AccessTokenCookieName, accessToken, BuildAccessCookieOptions());
        Response.Cookies.Append(AuthConstants.RefreshTokenCookieName, refreshToken, BuildRefreshCookieOptions());
    }

    private void ClearAuthCookies()
    {
        Response.Cookies.Delete(AuthConstants.AccessTokenCookieName, BuildDeleteAccessCookieOptions());
        Response.Cookies.Delete(AuthConstants.RefreshTokenCookieName, BuildDeleteRefreshCookieOptions());
    }

    private CookieOptions BuildAccessCookieOptions()
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddMinutes(_authOptions.AccessTokenLifetimeMinutes)
        };
    }

    private CookieOptions BuildRefreshCookieOptions()
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth",
            Expires = DateTimeOffset.UtcNow.AddDays(_authOptions.RefreshTokenLifetimeDays)
        };
    }

    private CookieOptions BuildDeleteAccessCookieOptions()
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = "/"
        };
    }

    private CookieOptions BuildDeleteRefreshCookieOptions()
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth"
        };
    }
}
