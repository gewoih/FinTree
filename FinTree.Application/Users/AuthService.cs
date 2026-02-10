using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FinTree.Domain.Categories;
using FinTree.Domain.Identity;
using FinTree.Infrastructure.Database;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Users;

public sealed class AuthService(
    UserManager<User> userManager,
    SignInManager<User> signInManager,
    IOptions<AuthOptions> authOptionsAccessor,
    IOptions<TelegramAuthOptions> telegramOptionsAccessor,
    AppDbContext context)
{
    private readonly AuthOptions _authOptions = authOptionsAccessor.Value;
    private readonly TelegramAuthOptions _telegramOptions = telegramOptionsAccessor.Value;

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

    public async Task<AuthResponse> LoginWithTelegramAsync(TelegramLoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_telegramOptions.BotToken))
            throw new InvalidOperationException("Telegram login is not configured.");

        ValidateTelegramLogin(request, _telegramOptions.BotToken);

        var user = await userManager.Users.FirstOrDefaultAsync(u => u.TelegramUserId == request.Id, ct);
        if (user != null)
            return new AuthResponse(GenerateJwtToken(user), user.Email!, user.Id);

        var email = $"tg-{request.Id}@fin-tree.ru";
        var username = !string.IsNullOrWhiteSpace(request.Username)
            ? request.Username
            : $"tg_{request.Id}";

        var newUser = new User(username, email, "RUB");
        newUser.LinkTelegramAccount(request.Id);

        await using var transaction = await context.Database.BeginTransactionAsync(ct);
        var result = await userManager.CreateAsync(newUser);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Telegram login failed: {errors}");
        }

        await SeedDefaultCategoriesAsync(newUser, ct);
        await context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return new AuthResponse(GenerateJwtToken(newUser), newUser.Email!, newUser.Id);
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

    private static void ValidateTelegramLogin(TelegramLoginRequest request, string botToken)
    {
        if (request.Id <= 0)
            throw new UnauthorizedAccessException("Invalid Telegram user id.");

        if (string.IsNullOrWhiteSpace(request.Hash))
            throw new UnauthorizedAccessException("Invalid Telegram hash.");

        var authDate = DateTimeOffset.FromUnixTimeSeconds(request.AuthDate);
        if (DateTimeOffset.UtcNow - authDate > TimeSpan.FromDays(1))
            throw new UnauthorizedAccessException("Telegram login expired.");

        var data = new SortedDictionary<string, string>
        {
            ["auth_date"] = request.AuthDate.ToString(CultureInfo.InvariantCulture),
            ["id"] = request.Id.ToString(CultureInfo.InvariantCulture)
        };

        if (!string.IsNullOrWhiteSpace(request.FirstName))
            data["first_name"] = request.FirstName;
        if (!string.IsNullOrWhiteSpace(request.LastName))
            data["last_name"] = request.LastName;
        if (!string.IsNullOrWhiteSpace(request.Username))
            data["username"] = request.Username;
        if (!string.IsNullOrWhiteSpace(request.PhotoUrl))
            data["photo_url"] = request.PhotoUrl;

        var dataCheckString = string.Join("\n", data.Select(kvp => $"{kvp.Key}={kvp.Value}"));
        var secretKey = SHA256.HashData(Encoding.UTF8.GetBytes(botToken));

        using var hmac = new HMACSHA256(secretKey);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dataCheckString));
        var computedHex = Convert.ToHexString(computedHash).ToLowerInvariant();

        var receivedHash = request.Hash.Trim().ToLowerInvariant();
        var receivedBytes = Encoding.UTF8.GetBytes(receivedHash);
        var computedBytes = Encoding.UTF8.GetBytes(computedHex);

        if (receivedBytes.Length != computedBytes.Length ||
            !CryptographicOperations.FixedTimeEquals(receivedBytes, computedBytes))
            throw new UnauthorizedAccessException("Telegram login validation failed.");
    }
}
