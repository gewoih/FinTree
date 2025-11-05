using FinTree.Application.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[AllowAnonymous]
[Route("api/[controller]")]
[ApiController]
public class AuthController(AuthService authService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var response = await authService.RegisterAsync(request, ct);
        return Ok(response);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var response = await authService.LoginAsync(request, ct);
        return Ok(response);
    }
}