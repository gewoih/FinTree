using FinTree.Domain.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FinTree.Api;

public sealed class OwnerRoleBootstrapper(
    RoleManager<Role> roleManager,
    UserManager<User> userManager,
    IOptions<AdminOptions> adminOptionsAccessor,
    ILogger<OwnerRoleBootstrapper> logger)
{
    private readonly AdminOptions _adminOptions = adminOptionsAccessor.Value;

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        await EnsureOwnerRoleExistsAsync();

        var normalizedOwnerEmails = _adminOptions.ResolveOwnerEmails()
            .Where(email => !string.IsNullOrWhiteSpace(email))
            .Select(email => email.Trim().ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (normalizedOwnerEmails.Length == 0)
            return;

        var ownerUsers = userManager.Users
            .Where(user => user.Email != null && normalizedOwnerEmails.Contains(user.Email.ToUpper()))
            .ToListAsync(ct);

        var ownerUsersList = await ownerUsers;

        var foundEmails = new HashSet<string>(
            ownerUsersList
                .Where(user => !string.IsNullOrWhiteSpace(user.Email))
                .Select(user => user.Email!.Trim().ToUpperInvariant()),
            StringComparer.OrdinalIgnoreCase);

        var missingEmails = normalizedOwnerEmails
            .Where(email => !foundEmails.Contains(email))
            .ToArray();

        foreach (var user in ownerUsersList)
        {
            ct.ThrowIfCancellationRequested();

            var isOwner = await userManager.IsInRoleAsync(user, AppRoleNames.Owner);
            if (isOwner)
                continue;

            var result = await userManager.AddToRoleAsync(user, AppRoleNames.Owner);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(error => error.Description));
                logger.LogWarning(
                    "Failed to assign Owner role to user {UserId} ({Email}). Errors: {Errors}",
                    user.Id,
                    user.Email,
                    errors);
            }
        }

        if (missingEmails.Length > 0)
        {
            logger.LogWarning(
                "Owner email(s) from Admin:OwnerEmails were not found: {MissingOwnerEmails}",
                string.Join(", ", missingEmails));
        }
    }

    private async Task EnsureOwnerRoleExistsAsync()
    {
        var roleExists = await roleManager.RoleExistsAsync(AppRoleNames.Owner);
        if (roleExists)
            return;

        var result = await roleManager.CreateAsync(new Role { Name = AppRoleNames.Owner });
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(error => error.Description));
            throw new InvalidOperationException($"Failed to create role '{AppRoleNames.Owner}'. Errors: {errors}");
        }
    }
}
