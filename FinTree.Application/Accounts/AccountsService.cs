using FinTree.Application.Currencies;
using FinTree.Application.Exceptions;
using FinTree.Application.Users;
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

        var balances = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserId)
            .GroupBy(t => t.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                Balance = g.Sum(t => t.Type == TransactionType.Income
                    ? t.Money.Amount
                    : -t.Money.Amount)
            })
            .ToListAsync(ct);

        var balanceByAccountId = balances.ToDictionary(x => x.AccountId, x => x.Balance);

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
            var balance = balanceByAccountId.GetValueOrDefault(account.Id, 0m);
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
        await context.SaveChangesAsync(ct);
        
        return account.Id;
    }
}
