using FinTree.Application.Abstractions;
using FinTree.Domain.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Admin;

public sealed class AdminService(IAppDbContext context, UserManager<User> userManager)
{
    private const int UsersSnapshotLimit = 20;

    public async Task<AdminOverviewDto> GetOverviewAsync(CancellationToken ct = default)
    {
        var nowUtc = DateTime.UtcNow;
        var last30DaysFromUtc = nowUtc.AddDays(-30);

        var totalUsers = await context.Users.CountAsync(ct);
        var activeSubscriptions = await context.Users
            .CountAsync(user => user.SubscriptionExpiresAtUtc != null && user.SubscriptionExpiresAtUtc > nowUtc, ct);

        var onboardingCompletedUsers = await context.Users
            .Where(user => user.MainAccountId != null && user.TelegramUserId != null)
            .CountAsync(user =>
                context.Transactions.Any(transaction => !transaction.IsTransfer && transaction.Account.UserId == user.Id),
                ct);

        var totalAccounts = await context.Accounts.CountAsync(ct);
        var totalTransactions = await context.Transactions.CountAsync(ct);
        var transactionsLast30Days = await context.Transactions
            .CountAsync(transaction => transaction.OccurredAt >= last30DaysFromUtc, ct);

        var userSnapshotsWithTransactionsRaw = await context.Transactions
            .AsNoTracking()
            .Where(transaction => !transaction.IsTransfer)
            .Join(
                context.Accounts.AsNoTracking(),
                transaction => transaction.AccountId,
                account => account.Id,
                (transaction, account) => new
                {
                    account.UserId,
                    transaction.OccurredAt
                })
            .GroupBy(item => item.UserId)
            .Select(group => new
            {
                UserId = group.Key,
                TransactionsCount = group.Count(),
                LastTransactionAtUtc = group.Max(item => (DateTime?)item.OccurredAt)
            })
            .Join(
                context.Users.AsNoTracking(),
                stats => stats.UserId,
                user => user.Id,
                (stats, user) => new
                {
                    user.Id,
                    user.Email,
                    Name = user.UserName,
                    user.TelegramUserId,
                    user.SubscriptionExpiresAtUtc,
                    user.MainAccountId,
                    stats.TransactionsCount,
                    stats.LastTransactionAtUtc
                })
            .OrderByDescending(user => user.LastTransactionAtUtc)
            .ThenByDescending(user => user.TransactionsCount)
            .ThenBy(user => user.Email)
            .Take(UsersSnapshotLimit)
            .ToListAsync(ct);

        var userSnapshotsWithTransactions = userSnapshotsWithTransactionsRaw
            .Select(user => new UserSnapshotRow(
                user.Id,
                user.Email,
                user.Name,
                user.TelegramUserId,
                user.SubscriptionExpiresAtUtc,
                user.MainAccountId,
                user.TransactionsCount,
                user.LastTransactionAtUtc))
            .ToList();

        var userSnapshotsBase = new List<UserSnapshotRow>(UsersSnapshotLimit);
        userSnapshotsBase.AddRange(userSnapshotsWithTransactions);

        if (userSnapshotsBase.Count < UsersSnapshotLimit)
        {
            var existingUserIds = userSnapshotsBase.Select(snapshot => snapshot.Id).ToArray();
            var remainingSlots = UsersSnapshotLimit - userSnapshotsBase.Count;

            var usersWithoutTransactionsRaw = await context.Users
                .AsNoTracking()
                .Where(user => !existingUserIds.Contains(user.Id))
                .OrderBy(user => user.Email)
                .Select(user => new
                {
                    user.Id,
                    user.Email,
                    Name = user.UserName,
                    user.TelegramUserId,
                    user.SubscriptionExpiresAtUtc,
                    user.MainAccountId
                })
                .Take(remainingSlots)
                .ToListAsync(ct);

            var usersWithoutTransactions = usersWithoutTransactionsRaw
                .Select(user => new UserSnapshotRow(
                    user.Id,
                    user.Email,
                    user.Name,
                    user.TelegramUserId,
                    user.SubscriptionExpiresAtUtc,
                    user.MainAccountId,
                    0,
                    null))
                .ToList();

            userSnapshotsBase.AddRange(usersWithoutTransactions);
        }

        var snapshotUserIds = userSnapshotsBase.Select(snapshot => snapshot.Id).ToArray();
        var snapshotUsersById = await context.Users
            .Where(user => snapshotUserIds.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, ct);

        var userSnapshots = new List<AdminUserSnapshotDto>(userSnapshotsBase.Count);
        foreach (var userSnapshot in userSnapshotsBase)
        {
            var hasActiveSubscription = userSnapshot.SubscriptionExpiresAtUtc is { } expiresAtUtc && expiresAtUtc > nowUtc;
            var isTelegramLinked = userSnapshot.TelegramUserId != null;
            var isOnboardingCompleted =
                userSnapshot.MainAccountId != null && isTelegramLinked && userSnapshot.TransactionsCount > 0;

            var isOwner = false;
            if (snapshotUsersById.TryGetValue(userSnapshot.Id, out var user))
            {
                isOwner = await userManager.IsInRoleAsync(user, AppRoleNames.Owner);
            }

            userSnapshots.Add(new AdminUserSnapshotDto(
                userSnapshot.Id,
                userSnapshot.Email,
                string.IsNullOrWhiteSpace(userSnapshot.Name)
                    ? userSnapshot.Email ?? userSnapshot.Id.ToString()
                    : userSnapshot.Name,
                isOwner,
                hasActiveSubscription,
                isOnboardingCompleted,
                isTelegramLinked,
                userSnapshot.TransactionsCount,
                userSnapshot.LastTransactionAtUtc));
        }

        var kpis = new AdminKpisDto(
            totalUsers,
            activeSubscriptions,
            ComputeRatePercent(activeSubscriptions, totalUsers),
            onboardingCompletedUsers,
            ComputeRatePercent(onboardingCompletedUsers, totalUsers),
            totalAccounts,
            totalTransactions,
            transactionsLast30Days);

        return new AdminOverviewDto(kpis, userSnapshots);
    }

    private static decimal ComputeRatePercent(int numerator, int denominator)
    {
        if (denominator == 0)
            return 0m;

        return decimal.Round((decimal)numerator / denominator * 100m, 1, MidpointRounding.AwayFromZero);
    }

    private readonly record struct UserSnapshotRow(
        Guid Id,
        string? Email,
        string? Name,
        long? TelegramUserId,
        DateTime? SubscriptionExpiresAtUtc,
        Guid? MainAccountId,
        int TransactionsCount,
        DateTime? LastTransactionAtUtc
    );
}
