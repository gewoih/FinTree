using FinTree.Application.Currencies;
using FinTree.Application.Exceptions;
using FinTree.Application.Users;
using FinTree.Domain.Accounts;
using FinTree.Domain.Identity;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Accounts;

public sealed class AccountsService(
    AppDbContext context,
    ICurrentUser currentUser,
    CurrencyConverter currencyConverter)
{
    public async Task<List<AccountDto>> GetAccounts(CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var userMeta = await context.Users
            .AsNoTracking()
            .Where(u => u.Id == currentUserId)
            .Select(u => new { u.BaseCurrencyCode, u.MainAccountId })
            .SingleAsync(ct);

        var accounts = await context.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == currentUserId)
            .Select(a => new { a.Id, a.CurrencyCode, a.Name, a.Type })
            .ToListAsync(ct);

        var latestAdjustments = await context.AccountBalanceAdjustments
            .AsNoTracking()
            .Where(a => a.Account.UserId == currentUserId)
            .Select(a => new { a.AccountId, a.Amount, a.OccurredAt })
            .ToListAsync(ct);

        var latestAdjustmentByAccount = latestAdjustments
            .GroupBy(a => a.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(x => x.OccurredAt).First());

        var transactions = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserId)
            .Select(g => new
            {
                g.AccountId,
                g.Type,
                g.Money,
                g.OccurredAt
            })
            .ToListAsync(ct);

        var transactionDeltas = transactions
            .GroupBy(t => t.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(t => new
                {
                    Delta = t.Type == TransactionType.Income ? t.Money.Amount : -t.Money.Amount,
                    t.OccurredAt
                }).ToList());

        var rateByCurrency = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(userMeta.BaseCurrencyCode))
        {
            var nowUtc = DateTime.UtcNow;
            foreach (var code in accounts.Select(a => a.CurrencyCode).Distinct())
            {
                if (string.Equals(code, userMeta.BaseCurrencyCode, StringComparison.OrdinalIgnoreCase))
                {
                    rateByCurrency[code] = 1m;
                    continue;
                }

                var converted = await currencyConverter.ConvertAsync(
                    new Money(code, 1m),
                    userMeta.BaseCurrencyCode,
                    nowUtc,
                    ct);
                rateByCurrency[code] = converted.Amount;
            }
        }

        var result = new List<AccountDto>(accounts.Count);
        foreach (var account in accounts)
        {
            decimal balance = 0m;
            DateTime? lastAdjustmentAt = null;
            if (latestAdjustmentByAccount.TryGetValue(account.Id, out var adjustment))
            {
                balance = adjustment.Amount;
                lastAdjustmentAt = adjustment.OccurredAt;
            }

            if (transactionDeltas.TryGetValue(account.Id, out var deltas))
            {
                var deltaSum = deltas
                    .Where(t => !lastAdjustmentAt.HasValue || t.OccurredAt > lastAdjustmentAt.Value)
                    .Sum(t => t.Delta);
                balance += deltaSum;
            }

            var rate = rateByCurrency.TryGetValue(account.CurrencyCode, out var foundRate) ? foundRate : 1m;
            var balanceInBase = Math.Round(balance * rate, 2, MidpointRounding.AwayFromZero);
            var roundedBalance = Math.Round(balance, 2, MidpointRounding.AwayFromZero);

            result.Add(new AccountDto(
                account.Id,
                account.CurrencyCode,
                account.Name,
                account.Type,
                account.Id == userMeta.MainAccountId,
                roundedBalance,
                balanceInBase));
        }

        return result;
    }
    
    public async Task<Guid> CreateAsync(CreateAccount command, CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var user = await context.Users.SingleOrDefaultAsync(x => x.Id == currentUserId, ct);
        if (user is null)
            throw new UnauthorizedAccessException();
        
        var account = user.AddAccount(command.CurrencyCode, command.Type, command.Name);
        if (command.InitialBalance != 0m)
        {
            var adjustment = new AccountBalanceAdjustment(account, command.InitialBalance, DateTime.UtcNow);
            await context.AccountBalanceAdjustments.AddAsync(adjustment, ct);
        }
        await context.SaveChangesAsync(ct);
        
        return account.Id;
    }

    public async Task<List<AccountBalanceAdjustmentDto>> GetBalanceAdjustmentsAsync(Guid accountId,
        CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var adjustments = await context.AccountBalanceAdjustments
            .AsNoTracking()
            .Where(a => a.AccountId == accountId && a.Account.UserId == currentUserId)
            .OrderByDescending(a => a.OccurredAt)
            .Select(a => new AccountBalanceAdjustmentDto(a.Id, a.AccountId, a.Amount, a.OccurredAt))
            .ToListAsync(ct);

        return adjustments;
    }

    public async Task<Guid> CreateBalanceAdjustmentAsync(Guid accountId, decimal amount,
        CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var account = await context.Accounts
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is null)
            throw new NotFoundException("Счет не найден", accountId);
        if (account.UserId != currentUserId)
            throw new InvalidOperationException("Доступ запрещен");

        var adjustment = new AccountBalanceAdjustment(accountId, amount, DateTime.UtcNow);
        await context.AccountBalanceAdjustments.AddAsync(adjustment, ct);
        await context.SaveChangesAsync(ct);

        return adjustment.Id;
    }
}
