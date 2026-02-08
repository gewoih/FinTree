using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FinTree.Domain.Categories;
using FinTree.Domain.Identity;
using FinTree.Infrastructure.Database;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace FinTree.Application.Users;

public sealed class AuthService(
    UserManager<User> userManager,
    SignInManager<User> signInManager,
    IOptions<AuthOptions> authOptionsAccessor,
    AppDbContext context)
{
    private readonly AuthOptions _authOptions = authOptionsAccessor.Value;

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct)
    {
        var user = new User(request.Email, request.Email, "RUB");
        await using var transaction = await context.Database.BeginTransactionAsync(ct);

        var result = await userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"User registration failed: {errors}");
        }

        await SeedDefaultCategoriesAsync(user, ct);
        await context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        var token = GenerateJwtToken(user);
        return new AuthResponse(token, user.Email!, user.Id);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            throw new UnauthorizedAccessException("Invalid email or password");

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
            throw new UnauthorizedAccessException("Invalid email or password");

        var token = GenerateJwtToken(user);
        return new AuthResponse(token, user.Email!, user.Id);
    }

    private string GenerateJwtToken(User user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.UserName)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_authOptions.JwtSecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _authOptions.Issuer,
            audience: _authOptions.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(_authOptions.TokenLifetimeDays),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private Task SeedDefaultCategoriesAsync(User user, CancellationToken ct)
    {
        var categories = DefaultTransactionCategories.All
            .Select(template => template.IsDefault
                ? TransactionCategory.CreateDefault(user.Id, template.Name, template.Color, template.Icon,
                    template.Type, template.IsMandatory)
                : TransactionCategory.CreateUser(user.Id, template.Name, template.Color, template.Icon,
                    template.Type, template.IsMandatory))
            .ToList();

        return context.TransactionCategories.AddRangeAsync(categories, ct);
    }
}
