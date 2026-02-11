using FinTree.Application.Exceptions;
using FinTree.Application.Transactions.Dto;
using FinTree.Domain.Identity;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Users;

public sealed class UserService(AppDbContext context, ICurrentUser currentUser)
{
    public async Task<MeDto> GetCurrentUserDataAsync(CancellationToken ct)
    {
        var currentUserId = currentUser.Id;
        var userData = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => new MeDto(
                u.Id,
                u.UserName ?? u.Email ?? string.Empty,
                u.Email,
                u.TelegramUserId,
                u.BaseCurrencyCode))
            .SingleOrDefaultAsync(cancellationToken: ct);

        if (userData.Id == Guid.Empty)
            throw new NotFoundException(nameof(User), currentUserId);

        return userData;
    }

    public async Task MarkAsMainAsync(Guid accountId, CancellationToken ct = default)
    {
        var user = await context.Users
            .Include(u => u.Accounts)
            .SingleOrDefaultAsync(x => x.Id == currentUser.Id, ct);

        if (user is null)
            throw new NotFoundException(nameof(User), accountId);

        user.SetMainAccount(accountId);
        await context.SaveChangesAsync(ct);
    }

    public async Task<MeDto> UpdateProfileAsync(UpdateUserProfileRequest request, CancellationToken ct)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == currentUser.Id, ct);
        if (user == null)
            throw new NotFoundException(nameof(User), currentUser.Id);

        user.SetBaseCurrency(request.BaseCurrencyCode);

        var telegramUserId = request.TelegramUserId;
        if (telegramUserId.HasValue)
        {
            if (telegramUserId.Value <= 0)
                throw new DomainValidationException("Некорректный Telegram ID");
           
            user.LinkTelegramAccount(telegramUserId.Value);
        }
        else
        {
            user.UnlinkTelegramAccount();
        }

        await context.SaveChangesAsync(ct);

        return new MeDto(
            user.Id,
            user.UserName ?? user.Email ?? string.Empty,
            user.Email,
            user.TelegramUserId,
            user.BaseCurrencyCode);
    }

    public async Task<List<TransactionCategoryDto>> GetUserCategoriesAsync(CancellationToken ct)
    {
        var userId = currentUser.Id;
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty, nameof(userId));

        var categoriesByUsage = await context.TransactionCategories
            .Where(tc => tc.UserId == userId)
            .GroupJoin(
                context.Transactions.Where(t => t.Account.UserId == userId && !t.IsTransfer),
                tc => tc.Id,
                t => t.CategoryId,
                (tc, transactions) => new
                {
                    Category = tc,
                    Usage = transactions.Count()
                })
            .OrderByDescending(x => x.Usage)
            .ThenBy(x => x.Category.Name)
            .Select(x => new TransactionCategoryDto(
                x.Category.Id,
                x.Category.Name,
                x.Category.Color,
                x.Category.Icon,
                x.Category.Type,
                x.Category.IsMandatory
            ))
            .ToListAsync(ct);

        return categoriesByUsage;
    }
}
