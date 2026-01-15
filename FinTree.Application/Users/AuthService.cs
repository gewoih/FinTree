using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FinTree.Domain.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace FinTree.Application.Users;

public sealed class AuthService(UserManager<User> userManager, SignInManager<User> signInManager)
{
    public const string JwtSecretKey =
        "d6e9d94a5e3ac16ae94e0d4059198fba99faf83776fbdd839a1821cbf6bdefce9309652979ef97589c736f074b51362f91d77b425366978e7eb50dff551951f0445eab8856e164af3bbf4e39f1bc07d4ae22df788975fa28d9bd31403fad4a767bc20002fbf352fa9718ff2ec80b719dc98c3998f911610cf063166db5d43c8ebb2a40561b9b534197ac542f55d5c062839d6517018cd7a78e5e3f810d5a25e8e786d4557e6bfef63f041855338168a85eaedbf019c625f7a439bc303156040e9689c3158a7f49e4c7966ed2e21b0fbf12320e6b5fc419cccc9bec3febe0803cbb33083215d3ad7981eb20c59182e0d3154638041fb6a7577ca3e17de6bc300f";

    public const string ValidIssuer = "FinTree.Api";
    public const string ValidAudience = "FinTree.Spa";

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct)
    {
        var user = new User(request.Email, request.Email, "RUB");
        var result = await userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"User registration failed: {errors}");
        }

        var token = GenerateJwtToken(user);
        return new AuthResponse(token, user.Email!, user.Id);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            throw new UnauthorizedAccessException("Invalid email or password");

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
        if (!result.Succeeded)
            throw new UnauthorizedAccessException("Invalid email or password");

        var token = GenerateJwtToken(user);
        return new AuthResponse(token, user.Email!, user.Id);
    }

    private static string GenerateJwtToken(User user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.UserName)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: ValidIssuer,
            audience: ValidAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}