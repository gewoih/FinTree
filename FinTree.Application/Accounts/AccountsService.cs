using FinTree.Application.Currencies;
using FinTree.Application.Exceptions;
using FinTree.Application.Users;
using FinTree.Domain.Accounts;
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
    private readonly record struct CashFlowEvent(DateTime OccurredAt, decimal Amount);
    private readonly record struct BalanceAdjustmentEvent(DateTime OccurredAt, decimal Amount);

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
            .Select(a => new { a.Id, a.CurrencyCode, a.Name, a.Type, a.IsLiquid })
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
                account.IsLiquid,
                account.Id == userMeta.MainAccountId,
                roundedBalance,
                balanceInBase));
        }

        return result;
    }

    public async Task<InvestmentsOverviewDto> GetInvestmentsOverviewAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var baseCurrencyCode = await context.Users
            .AsNoTracking()
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var (periodFrom, periodTo, periodToExclusive) = NormalizePeriod(from, to);

        var accounts = await context.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == currentUserId &&
                        (a.Type == AccountType.Brokerage || a.Type == AccountType.Crypto || a.Type == AccountType.Deposit))
            .Select(a => new { a.Id, a.Name, a.CurrencyCode, a.Type, a.IsLiquid })
            .ToListAsync(ct);

        if (accounts.Count == 0)
        {
            return new InvestmentsOverviewDto(
                periodFrom,
                periodTo,
                0m,
                0m,
                null,
                new List<InvestmentAccountOverviewDto>());
        }

        var accountIds = accounts.Select(a => a.Id).ToList();

        var adjustments = await context.AccountBalanceAdjustments
            .AsNoTracking()
            .Where(a => accountIds.Contains(a.AccountId))
            .Select(a => new { a.AccountId, a.Amount, a.OccurredAt })
            .ToListAsync(ct);

        var transactions = await context.Transactions
            .AsNoTracking()
            .Where(t => accountIds.Contains(t.AccountId))
            .Select(t => new { t.AccountId, t.Type, t.Money, t.OccurredAt })
            .ToListAsync(ct);

        var adjustmentsByAccount = adjustments
            .GroupBy(a => a.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(a => new BalanceAdjustmentEvent(NormalizeUtc(a.OccurredAt), a.Amount))
                    .OrderBy(x => x.OccurredAt)
                    .ToList());

        var cashFlowsByAccount = transactions
            .GroupBy(t => t.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(t => new CashFlowEvent(
                        NormalizeUtc(t.OccurredAt),
                        t.Type == TransactionType.Income ? t.Money.Amount : -t.Money.Amount))
                    .OrderBy(x => x.OccurredAt)
                    .ToList());

        var rateByCurrency = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(baseCurrencyCode))
        {
            var nowUtc = DateTime.UtcNow;
            foreach (var code in accounts.Select(a => a.CurrencyCode).Distinct())
            {
                if (string.Equals(code, baseCurrencyCode, StringComparison.OrdinalIgnoreCase))
                {
                    rateByCurrency[code] = 1m;
                    continue;
                }

                var converted = await currencyConverter.ConvertAsync(
                    new Money(code, 1m),
                    baseCurrencyCode,
                    nowUtc,
                    ct);
                rateByCurrency[code] = converted.Amount;
            }
        }

        var overviewAccounts = new List<InvestmentAccountOverviewDto>(accounts.Count);
        decimal totalValueInBase = 0m;
        decimal liquidValueInBase = 0m;
        decimal weightedReturnSum = 0m;
        decimal weightedReturnBase = 0m;

        foreach (var account in accounts)
        {
            adjustmentsByAccount.TryGetValue(account.Id, out var accountAdjustments);
            cashFlowsByAccount.TryGetValue(account.Id, out var accountCashFlows);

            accountAdjustments ??= [];
            accountCashFlows ??= [];

            var lastAdjustmentAt = accountAdjustments.LastOrDefault().OccurredAt;

            var startBalance = ComputeBalanceAt(periodFrom, accountAdjustments, accountCashFlows);
            var endBalance = ComputeBalanceAt(periodToExclusive, accountAdjustments, accountCashFlows);

            var periodCashFlows = accountCashFlows
                .Where(flow => flow.OccurredAt >= periodFrom && flow.OccurredAt < periodToExclusive)
                .ToList();

            var hasAnchorAdjustment = accountAdjustments.Any(a => a.OccurredAt <= periodFrom);
            var effectiveFrom = periodFrom;
            var effectiveStartBalance = startBalance;
            var effectiveCashFlows = periodCashFlows;
            var canComputeReturn = true;

            if (!hasAnchorAdjustment)
            {
                var firstAdjustmentInPeriod = accountAdjustments
                    .FirstOrDefault(a => a.OccurredAt >= periodFrom && a.OccurredAt < periodToExclusive);

                if (firstAdjustmentInPeriod.OccurredAt == default)
                {
                    canComputeReturn = false;
                }
                else
                {
                    effectiveFrom = firstAdjustmentInPeriod.OccurredAt;
                    effectiveStartBalance = firstAdjustmentInPeriod.Amount;
                    effectiveCashFlows = periodCashFlows
                        .Where(flow => flow.OccurredAt > effectiveFrom)
                        .ToList();
                }
            }

            var returnPercent = canComputeReturn
                ? ComputeModifiedDietz(
                    effectiveFrom,
                    periodToExclusive,
                    effectiveStartBalance,
                    endBalance,
                    effectiveCashFlows)
                : null;

            var rate = rateByCurrency.TryGetValue(account.CurrencyCode, out var foundRate) ? foundRate : 1m;
            var balanceInBase = Round2(endBalance * rate);
            var roundedBalance = Round2(endBalance);

            overviewAccounts.Add(new InvestmentAccountOverviewDto(
                account.Id,
                account.Name,
                account.CurrencyCode,
                account.Type,
                account.IsLiquid,
                roundedBalance,
                balanceInBase,
                lastAdjustmentAt == default ? null : lastAdjustmentAt,
                returnPercent));

            totalValueInBase += balanceInBase;
            if (account.IsLiquid)
                liquidValueInBase += balanceInBase;

            if (returnPercent.HasValue)
            {
                weightedReturnSum += returnPercent.Value * balanceInBase;
                weightedReturnBase += balanceInBase;
            }
        }

        var totalReturnPercent = weightedReturnBase > 0m
            ? Math.Round(weightedReturnSum / weightedReturnBase, 4, MidpointRounding.AwayFromZero)
            : (decimal?)null;

        return new InvestmentsOverviewDto(
            periodFrom,
            periodTo,
            Round2(totalValueInBase),
            Round2(liquidValueInBase),
            totalReturnPercent,
            overviewAccounts);
    }
    
    public async Task<Guid> CreateAsync(CreateAccount command, CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var user = await context.Users.SingleOrDefaultAsync(x => x.Id == currentUserId, ct);
        if (user is null)
            throw new UnauthorizedAccessException();
        
        var account = user.AddAccount(command.CurrencyCode, command.Type, command.Name, command.IsLiquid);
        if (command.InitialBalance != 0m)
        {
            var adjustment = new AccountBalanceAdjustment(account, command.InitialBalance, DateTime.UtcNow);
            await context.AccountBalanceAdjustments.AddAsync(adjustment, ct);
        }
        await context.SaveChangesAsync(ct);
        
        return account.Id;
    }

    public async Task UpdateLiquidityAsync(Guid accountId, bool isLiquid, CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var account = await context.Accounts
            .FirstOrDefaultAsync(a => a.Id == accountId, ct);

        if (account is null)
            throw new NotFoundException("Счет не найден", accountId);
        if (account.UserId != currentUserId)
            throw new InvalidOperationException("Доступ запрещен");

        account.SetLiquidity(isLiquid);
        await context.SaveChangesAsync(ct);
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

    public async Task DeleteAsync(Guid accountId, CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var account = await context.Accounts
            .Include(a => a.User)
            .ThenInclude(u => u.Accounts)
            .Include(a => a.Transactions)
            .FirstOrDefaultAsync(a => a.Id == accountId, ct);

        if (account is null)
            throw new NotFoundException("Счет не найден", accountId);

        if (account.UserId != currentUserId)
            throw new InvalidOperationException("Доступ запрещен");

        var adjustments = await context.AccountBalanceAdjustments
            .Where(a => a.AccountId == accountId)
            .ToListAsync(ct);

        foreach (var transaction in account.Transactions)
            transaction.Delete();

        foreach (var adjustment in adjustments)
            adjustment.Delete();

        var user = account.User;
        if (user.MainAccountId == accountId)
        {
            var nextAccount = user.Accounts.FirstOrDefault(a => a.Id != accountId);
            if (nextAccount is not null)
                user.SetMainAccount(nextAccount.Id);
            else
                user.ClearMainAccount();
        }

        account.Delete();
        await context.SaveChangesAsync(ct);
    }

    private static DateTime NormalizeUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Unspecified)
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return value.ToUniversalTime();
    }

    private static (DateTime From, DateTime To, DateTime ToExclusive) NormalizePeriod(DateTime? from, DateTime? to)
    {
        var endDate = (to ?? DateTime.UtcNow).Date;
        var startDate = (from ?? endDate.AddMonths(-6)).Date;

        if (startDate > endDate)
        {
            (startDate, endDate) = (endDate, startDate);
        }

        var fromUtc = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);
        var toExclusive = toUtc.AddDays(1);

        return (fromUtc, toUtc, toExclusive);
    }

    private static decimal ComputeBalanceAt(
        DateTime at,
        List<BalanceAdjustmentEvent> adjustments,
        List<CashFlowEvent> cashFlows)
    {
        var anchorAdjustment = adjustments
            .Where(a => a.OccurredAt <= at)
            .OrderByDescending(a => a.OccurredAt)
            .FirstOrDefault();

        var balance = anchorAdjustment.OccurredAt == default
            ? 0
            : anchorAdjustment.Amount;

        var anchorAt = anchorAdjustment.OccurredAt == default ? (DateTime?)null : anchorAdjustment.OccurredAt;

        if (cashFlows.Count == 0)
            return balance;

        foreach (var flow in cashFlows)
        {
            if (flow.OccurredAt > at)
                break;

            if (!anchorAt.HasValue || flow.OccurredAt > anchorAt.Value)
                balance += flow.Amount;
        }

        return balance;
    }

    private static decimal? ComputeModifiedDietz(
        DateTime periodFrom,
        DateTime periodTo,
        decimal startBalance,
        decimal endBalance,
        List<CashFlowEvent> cashFlows)
    {
        var totalDays = (periodTo - periodFrom).TotalDays;
        if (totalDays <= 0)
            return null;

        decimal totalFlow = 0m;
        decimal weightedFlow = 0m;

        foreach (var flow in cashFlows)
        {
            var daysRemaining = (periodTo - flow.OccurredAt).TotalDays;
            if (daysRemaining < 0)
                continue;

            var weight = (decimal)(daysRemaining / totalDays);
            totalFlow += flow.Amount;
            weightedFlow += flow.Amount * weight;
        }

        var denominator = startBalance + weightedFlow;
        if (Math.Abs(denominator) < 0.0001m)
            return null;

        var rate = (endBalance - startBalance - totalFlow) / denominator;
        return Math.Round(rate, 4, MidpointRounding.AwayFromZero);
    }


    private static decimal Round2(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
