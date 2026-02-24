using FinTree.Application.Abstractions;
using FinTree.Application.Exceptions;
using FinTree.Application.Transactions.Dto;
using FinTree.Domain.Identity;
using FinTree.Domain.Subscriptions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Users;

public sealed class UserService(IAppDbContext context, ICurrentUser currentUser, UserManager<User> userManager)
{
    public async Task<MeDto> GetCurrentUserDataAsync(CancellationToken ct)
    {
        var currentUserId = currentUser.Id;
        var userData = await context.Users
            .Include(u => u.Accounts)
            .Where(u => u.Id == currentUserId)
            .SingleOrDefaultAsync(cancellationToken: ct);

        if (userData is null)
            throw new NotFoundException(nameof(User), currentUserId);

        if (userData.EnsureMainAccountAssigned(assumeAccountsCollectionIsComplete: true))
            await context.SaveChangesAsync(ct);

        var nowUtc = DateTime.UtcNow;
        var (onboardingCompleted, onboardingSkipped) = await ResolveOnboardingStateAsync(userData, ct);
        var isOwner = await userManager.IsInRoleAsync(userData, AppRoleNames.Owner);
        return MapMe(userData, nowUtc, onboardingCompleted, onboardingSkipped, isOwner);
    }

    public async Task<MeDto> SimulateSubscriptionPaymentAsync(SimulateSubscriptionPaymentRequest request, CancellationToken ct)
    {
        var user = await context.Users
            .SingleOrDefaultAsync(u => u.Id == currentUser.Id, ct);

        if (user is null)
            throw new NotFoundException(nameof(User), currentUser.Id);

        var now = DateTime.UtcNow;
        if (user.HasActiveSubscription(now))
        {
            throw new ConflictException(
                "У вас уже есть активная подписка. Повторная оплата сейчас не требуется.",
                "subscription_already_active");
        }

        var listedPriceRub = SubscriptionCatalog.ResolvePriceRub(request.Plan);
        var billingPeriodMonths = SubscriptionCatalog.ResolveBillingPeriodMonths(request.Plan);
        var (subscriptionStartsAtUtc, subscriptionExpiresAtUtc) =
            user.ActivateSubscription(now, SubscriptionCatalog.SimulatedGrantedMonths);

        var payment = SubscriptionPayment.CreateSucceeded(
            userId: user.Id,
            plan: request.Plan,
            listedPriceRub: listedPriceRub,
            chargedPriceRub: 0m,
            billingPeriodMonths: billingPeriodMonths,
            grantedMonths: SubscriptionCatalog.SimulatedGrantedMonths,
            paidAtUtc: now,
            subscriptionStartsAtUtc: subscriptionStartsAtUtc,
            subscriptionEndsAtUtc: subscriptionExpiresAtUtc,
            isSimulation: true,
            provider: "simulation-ui");

        await context.SubscriptionPayments.AddAsync(payment, ct);
        await context.SaveChangesAsync(ct);

        var (onboardingCompleted, onboardingSkipped) = await ResolveOnboardingStateAsync(user, ct);
        var isOwner = await userManager.IsInRoleAsync(user, AppRoleNames.Owner);
        return MapMe(user, now, onboardingCompleted, onboardingSkipped, isOwner);
    }

    public async Task<MeDto> SkipOnboardingAsync(CancellationToken ct)
    {
        var user = await context.Users
            .SingleOrDefaultAsync(u => u.Id == currentUser.Id, ct);

        if (user is null)
            throw new NotFoundException(nameof(User), currentUser.Id);

        user.SkipOnboarding();
        await context.SaveChangesAsync(ct);

        var nowUtc = DateTime.UtcNow;
        var (onboardingCompleted, onboardingSkipped) = await ResolveOnboardingStateAsync(user, ct);
        var isOwner = await userManager.IsInRoleAsync(user, AppRoleNames.Owner);
        return MapMe(user, nowUtc, onboardingCompleted, onboardingSkipped, isOwner);
    }

    public async Task MarkAsMainAsync(Guid accountId, CancellationToken ct = default)
    {
        var user = await context.Users
            .Include(u => u.Accounts)
            .SingleOrDefaultAsync(x => x.Id == currentUser.Id, ct);

        if (user is null)
            throw new NotFoundException(nameof(User), currentUser.Id);

        var account = user.Accounts.FirstOrDefault(a => a.Id == accountId);
        if (account is null)
            throw new NotFoundException("Счет не найден", accountId);
        if (account.IsArchived)
            throw new ConflictException("Нельзя назначить архивный счет основным.");

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

        var nowUtc = DateTime.UtcNow;
        var (onboardingCompleted, onboardingSkipped) = await ResolveOnboardingStateAsync(user, ct);
        var isOwner = await userManager.IsInRoleAsync(user, AppRoleNames.Owner);
        return MapMe(user, nowUtc, onboardingCompleted, onboardingSkipped, isOwner);
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

    public async Task<List<SubscriptionPaymentDto>> GetSubscriptionPaymentsAsync(CancellationToken ct)
    {
        var userId = currentUser.Id;
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty, nameof(userId));

        return await context.SubscriptionPayments
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.PaidAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Select(x => new SubscriptionPaymentDto(
                x.Id,
                x.Plan,
                x.Status,
                x.ListedPriceRub,
                x.ChargedPriceRub,
                x.BillingPeriodMonths,
                x.GrantedMonths,
                x.IsSimulation,
                x.PaidAtUtc,
                x.SubscriptionStartsAtUtc,
                x.SubscriptionEndsAtUtc,
                x.Provider,
                x.ExternalPaymentId))
            .ToListAsync(ct);
    }

    private async Task<(bool Completed, bool Skipped)> ResolveOnboardingStateAsync(User user, CancellationToken ct)
    {
        var hasMainAccount = user.MainAccountId is not null;
        var hasTelegramLinked = user.TelegramUserId is not null;
        var hasFirstTransaction = false;

        if (hasMainAccount && hasTelegramLinked)
        {
            hasFirstTransaction = await context.Transactions
                .AsNoTracking()
                .AnyAsync(t => t.Account.UserId == user.Id && !t.IsTransfer, ct);
        }

        return (hasMainAccount && hasTelegramLinked && hasFirstTransaction, user.OnboardingSkippedAtUtc != null);
    }

    private static MeDto MapMe(
        User user,
        DateTime nowUtc,
        bool onboardingCompleted,
        bool onboardingSkipped,
        bool isOwner)
    {
        var isSubscriptionActive = user.HasActiveSubscription(nowUtc);
        var subscription = new SubscriptionInfoDto(
            IsActive: isSubscriptionActive,
            IsReadOnlyMode: !isSubscriptionActive,
            ExpiresAtUtc: user.SubscriptionExpiresAtUtc,
            MonthPriceRub: SubscriptionCatalog.MonthPriceRub,
            YearPriceRub: SubscriptionCatalog.YearPriceRub);

        return new MeDto(
            user.Id,
            user.UserName ?? user.Email ?? string.Empty,
            user.Email,
            user.TelegramUserId,
            user.RegisteredViaTelegram,
            user.BaseCurrencyCode,
            subscription,
            onboardingCompleted,
            onboardingSkipped,
            isOwner);
    }
}
