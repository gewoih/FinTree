using FinTree.Application.Abstractions;
using FinTree.Application.Currencies;
using FinTree.Application.Exceptions;
using FinTree.Application.Users;
using FinTree.Domain.Accounts;
using FinTree.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Accounts;

public sealed class AccountsService(
    IAppDbContext context,
    ICurrentUser currentUser,
    CurrencyConverter currencyConverter)
{
    private static readonly TimeSpan OpeningBalanceDetectionWindow = TimeSpan.FromSeconds(5);
    private static readonly DateTime OpeningBalanceAnchorUtc = DateTime.UnixEpoch;
    private readonly record struct CashFlowEvent(DateTime OccurredAt, decimal Amount);
    private readonly record struct BalanceAdjustmentEvent(DateTime OccurredAt, decimal Amount);
    private readonly record struct ReturnInputs(
        bool CanCompute,
        DateTime StartAt,
        decimal StartBalance,
        decimal EndBalance,
        List<CashFlowEvent> CashFlows);
    private readonly record struct ReturnComponents(
        decimal CapitalBase,
        decimal Profit);

    public async Task<List<AccountDto>> GetAccounts(
        bool archived = false,
        CancellationToken ct = default,
        AccountType[]? types = null)
    {
        var currentUserId = currentUser.Id;
        var mainAccountId = await context.Users
            .AsNoTracking()
            .Where(u => u.Id == currentUserId)
            .Select(u => u.MainAccountId)
            .SingleAsync(ct);

        var accountTypes = types is { Length: > 0 } ? types : [AccountType.Bank];

        var accounts = await context.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == currentUserId && a.IsArchived == archived && accountTypes.Contains(a.Type))
            .Select(a => new { a.Id, a.CurrencyCode, a.Name, a.Type, a.IsLiquid, a.IsArchived })
            .ToListAsync(ct);

        return accounts
            .Select(a => new AccountDto(
                a.Id,
                a.CurrencyCode,
                a.Name,
                a.Type,
                a.IsLiquid,
                a.IsArchived,
                a.Id == mainAccountId))
            .ToList();
    }

    internal async Task<List<AccountAnalyticsSnapshot>> GetAccountSnapshotsAsync(
        bool includeArchived,
        AccountType[]? types = null,
        CancellationToken ct = default)
    {
        var query = context.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == currentUser.Id);

        if (!includeArchived)
            query = query.Where(a => !a.IsArchived);

        if (types is { Length: > 0 })
            query = query.Where(a => types.Contains(a.Type));

        var accounts = await query
            .Select(a => new { a.Id, a.CurrencyCode, a.IsLiquid, a.IsArchived, a.CreatedAt })
            .ToListAsync(ct);

        return accounts
            .Select(a => new AccountAnalyticsSnapshot(
                a.Id,
                a.CurrencyCode,
                a.IsLiquid,
                a.IsArchived,
                NormalizeUtc(a.CreatedAt.UtcDateTime)))
            .ToList();
    }

    public async Task<Guid> CreateInvestmentCashFlowAsync(
        Guid accountId,
        TransactionType type,
        decimal amount,
        DateTime occurredAt,
        string? description,
        CancellationToken ct = default)
    {
        if (type is not (TransactionType.Income or TransactionType.Expense))
            throw new DomainValidationException("Допустимый тип операции: пополнение (0) или вывод (1).");
        if (amount <= 0)
            throw new DomainValidationException("Сумма должна быть больше нуля.");

        var currentUserId = currentUser.Id;
        var account = await context.Accounts
            .FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is null)
            throw new NotFoundException("Счет не найден", accountId);
        if (account.UserId != currentUserId)
            throw new ForbiddenException();
        if (account.Type == AccountType.Bank)
            throw new DomainValidationException("Операция доступна только для инвестиционных счетов.");
        EnsureAccountIsNotArchived(account);

        var categories = await context.TransactionCategories
            .AsNoTracking()
            .Where(c => c.UserId == currentUserId)
            .Select(c => new { c.Id, c.Name, c.IsDefault })
            .ToListAsync(ct);

        if (categories.Count == 0)
            throw new ConflictException("Не удалось подобрать категорию для операции.");

        var categoryId = categories.FirstOrDefault(c => c.Name == "Без категории")?.Id
                         ?? categories.FirstOrDefault(c => c.IsDefault)?.Id
                         ?? categories[0].Id;

        var desc = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        var transaction = account.AddTransaction(type, categoryId, amount, occurredAt, desc, isMandatory: false);
        await context.SaveChangesAsync(ct);
        return transaction.Id;
    }

    internal async Task<List<AccountAdjustmentAnalyticsSnapshot>> GetAccountAdjustmentSnapshotsAsync(
        IReadOnlyCollection<Guid> accountIds,
        DateTime? beforeUtc = null,
        CancellationToken ct = default)
    {
        if (accountIds.Count == 0)
            return [];

        var query = context.AccountBalanceAdjustments
            .AsNoTracking()
            .Where(a => a.Account.UserId == currentUser.Id && accountIds.Contains(a.AccountId));

        if (beforeUtc.HasValue)
            query = query.Where(a => a.OccurredAt < beforeUtc.Value);

        var adjustments = await query
            .Select(a => new { a.AccountId, a.Amount, a.OccurredAt })
            .ToListAsync(ct);

        return adjustments
            .Select(a => new AccountAdjustmentAnalyticsSnapshot(
                a.AccountId,
                a.Amount,
                NormalizeUtc(a.OccurredAt)))
            .ToList();
    }

    public async Task<InvestmentsOverviewDto> GetInvestmentsOverviewAsync(
        DateTime? from,
        DateTime? to,
        bool archived = false,
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
                        a.IsArchived == archived &&
                        (a.Type == AccountType.Brokerage || a.Type == AccountType.Crypto || a.Type == AccountType.Deposit))
            .Select(a => new { a.Id, a.Name, a.CurrencyCode, a.Type, a.IsLiquid, a.CreatedAt })
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
        var accountCurrencyById = accounts.ToDictionary(a => a.Id, a => a.CurrencyCode);
        var accountCreatedAtById = accounts
            .ToDictionary(a => a.Id, a => NormalizeUtc(a.CreatedAt.UtcDateTime));

        var adjustments = await context.AccountBalanceAdjustments
            .AsNoTracking()
            .Where(a => accountIds.Contains(a.AccountId))
            .Select(a => new { a.AccountId, a.Amount, a.OccurredAt })
            .ToListAsync(ct);

        var latestAdjustmentAtByAccount = adjustments
            .GroupBy(a => a.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(a => NormalizeUtc(a.OccurredAt)).Max());

        var transactions = await context.Transactions
            .AsNoTracking()
            .Where(t => accountIds.Contains(t.AccountId))
            .Select(t => new { t.AccountId, t.Type, t.Money, t.OccurredAt })
            .ToListAsync(ct);

        var adjustmentsByAccount = adjustments
            .GroupBy(a => a.AccountId)
            .ToDictionary(
                g => g.Key,
                g => BuildAdjustmentTimeline(
                    g.Select(a => (a.OccurredAt, a.Amount)),
                    accountCreatedAtById[g.Key]));

        var cashFlowsByAccount = transactions
            .GroupBy(t => t.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(t => new CashFlowEvent(
                        NormalizeUtc(t.OccurredAt),
                        t.Type == TransactionType.Income ? t.Money.Amount : -t.Money.Amount))
                    .OrderBy(x => x.OccurredAt)
                    .ToList());

        var returnInputsByAccount = new Dictionary<Guid, ReturnInputs>(accounts.Count);
        var fxRateRequests = new HashSet<(string CurrencyCode, DateTime DayStartUtc)>();

        foreach (var account in accounts)
        {
            cashFlowsByAccount.TryGetValue(account.Id, out var accountCashFlows);
            accountCashFlows ??= [];

            fxRateRequests.Add((account.CurrencyCode, periodTo.Date));

            foreach (var flow in accountCashFlows.Where(flow => flow.OccurredAt >= periodFrom && flow.OccurredAt < periodToExclusive))
                fxRateRequests.Add((account.CurrencyCode, flow.OccurredAt.Date));
        }

        var overviewAccounts = new List<InvestmentAccountOverviewDto>(accounts.Count);
        decimal totalValueInBase = 0m;
        decimal liquidValueInBase = 0m;

        foreach (var account in accounts)
        {
            adjustmentsByAccount.TryGetValue(account.Id, out var accountAdjustments);
            cashFlowsByAccount.TryGetValue(account.Id, out var accountCashFlows);

            accountAdjustments ??= [];
            accountCashFlows ??= [];

            var hasLatestAdjustment = latestAdjustmentAtByAccount.TryGetValue(account.Id, out var latestAdjustmentAt);

            var startBalance = ComputeBalanceAt(periodFrom, accountAdjustments, accountCashFlows);
            var endBalance = ComputeBalanceAt(periodToExclusive, accountAdjustments, accountCashFlows);

            var periodCashFlows = accountCashFlows
                .Where(flow => flow.OccurredAt >= periodFrom && flow.OccurredAt < periodToExclusive)
                .ToList();

            var returnInputs = ResolveReturnInputs(periodFrom, periodToExclusive, startBalance, endBalance, accountAdjustments, periodCashFlows);
            returnInputsByAccount[account.Id] = returnInputs;

            if (returnInputs.CanCompute)
                fxRateRequests.Add((account.CurrencyCode, returnInputs.StartAt.Date));

            var returnPercent = ComputeSimpleReturn(returnInputs);
            var roundedBalance = Round2(endBalance);

            overviewAccounts.Add(new InvestmentAccountOverviewDto(
                account.Id,
                account.Name,
                account.CurrencyCode,
                account.Type,
                account.IsLiquid,
                roundedBalance,
                0m,
                hasLatestAdjustment ? latestAdjustmentAt : null,
                returnPercent));
        }

        var rateByCurrencyAndDay = await BuildFxRateMapAsync(fxRateRequests, baseCurrencyCode, ct);
        totalValueInBase = 0m;
        liquidValueInBase = 0m;

        for (var index = 0; index < overviewAccounts.Count; index++)
        {
            var overviewAccount = overviewAccounts[index];
            var account = accounts[index];
            var balanceInBase = Round2(ConvertToBaseCurrency(
                account.CurrencyCode,
                overviewAccount.Balance,
                periodTo,
                baseCurrencyCode,
                rateByCurrencyAndDay));

            overviewAccounts[index] = overviewAccount with { BalanceInBaseCurrency = balanceInBase };
            totalValueInBase += balanceInBase;

            if (overviewAccount.IsLiquid)
                liquidValueInBase += balanceInBase;
        }

        var totalReturnPercent = ComputePortfolioReturnPercent(
            accountCurrencyById,
            returnInputsByAccount,
            periodToExclusive,
            baseCurrencyCode,
            rateByCurrencyAndDay);

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
        
        var isLiquid = command.Type == AccountType.Bank ? true : command.IsLiquid;
        var account = user.AddAccount(command.CurrencyCode, command.Type, command.Name, isLiquid);
        await context.SaveChangesAsync(ct);
        
        return account.Id;
    }

    public async Task UpdateAsync(Guid accountId, UpdateAccount command, CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var account = await context.Accounts
            .FirstOrDefaultAsync(a => a.Id == accountId, ct);

        if (account is null)
            throw new NotFoundException("Счет не найден", accountId);
        if (account.UserId != currentUserId)
            throw new ForbiddenException();
        EnsureAccountIsNotArchived(account);

        account.Rename(command.Name);
        await context.SaveChangesAsync(ct);
    }

    public async Task UpdateLiquidityAsync(Guid accountId, bool isLiquid, CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var account = await context.Accounts
            .FirstOrDefaultAsync(a => a.Id == accountId, ct);

        if (account is null)
            throw new NotFoundException("Счет не найден", accountId);
        if (account.UserId != currentUserId)
            throw new ForbiddenException();
        if (account.Type == AccountType.Bank)
            throw new DomainValidationException("Банковские счета всегда ликвидны.");
        EnsureAccountIsNotArchived(account);

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
            throw new ForbiddenException();
        if (account.Type == AccountType.Bank)
            throw new DomainValidationException("Корректировка баланса недоступна для банковских счетов.");
        EnsureAccountIsNotArchived(account);

        var adjustment = new AccountBalanceAdjustment(accountId, amount, DateTime.UtcNow);
        await context.AccountBalanceAdjustments.AddAsync(adjustment, ct);
        await context.SaveChangesAsync(ct);

        return adjustment.Id;
    }

    public async Task ArchiveAsync(Guid accountId, CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var account = await context.Accounts
            .Include(a => a.User)
            .ThenInclude(u => u.Accounts)
            .FirstOrDefaultAsync(a => a.Id == accountId, ct);

        if (account is null)
            throw new NotFoundException("Счет не найден", accountId);
        if (account.UserId != currentUserId)
            throw new ForbiddenException();
        if (account.IsArchived)
            return;

        var user = account.User;
        if (user.MainAccountId == accountId)
        {
            var nextAccount = user.Accounts
                .Where(a => a.Id != accountId && !a.IsArchived)
                .OrderBy(a => a.CreatedAt)
                .FirstOrDefault();

            if (nextAccount is not null)
                user.SetMainAccount(nextAccount.Id);
            else
                user.ClearMainAccount();
        }

        account.Archive();
        await context.SaveChangesAsync(ct);
    }

    public async Task UnarchiveAsync(Guid accountId, CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var account = await context.Accounts
            .FirstOrDefaultAsync(a => a.Id == accountId, ct);

        if (account is null)
            throw new NotFoundException("Счет не найден", accountId);
        if (account.UserId != currentUserId)
            throw new ForbiddenException();
        if (!account.IsArchived)
            return;

        account.Unarchive();
        await context.SaveChangesAsync(ct);
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
            throw new ForbiddenException();

        var adjustments = await context.AccountBalanceAdjustments
            .Where(a => a.AccountId == accountId)
            .ToListAsync(ct);

        var transferIds = account.Transactions
            .Where(t => t.TransferId.HasValue)
            .Select(t => t.TransferId!.Value)
            .Distinct()
            .ToArray();

        if (transferIds.Length > 0)
        {
            var relatedTransferTransactions = await context.Transactions
                .Where(t => t.TransferId.HasValue && transferIds.Contains(t.TransferId.Value))
                .ToListAsync(ct);

            foreach (var relatedTransaction in relatedTransferTransactions)
                relatedTransaction.Delete();
        }

        foreach (var transaction in account.Transactions)
            transaction.Delete();

        foreach (var adjustment in adjustments)
            adjustment.Delete();

        var user = account.User;
        if (user.MainAccountId == accountId)
        {
            var nextAccount = user.Accounts
                .Where(a => a.Id != accountId && !a.IsArchived)
                .OrderBy(a => a.CreatedAt)
                .FirstOrDefault();
            if (nextAccount is not null)
                user.SetMainAccount(nextAccount.Id);
            else
                user.ClearMainAccount();
        }

        account.Delete();
        await context.SaveChangesAsync(ct);
    }

    private static void EnsureAccountIsNotArchived(Account account)
    {
        if (account.IsArchived)
            throw new ConflictException("Архивный счет недоступен для изменений. Сначала разархивируйте счет.");
    }

    private static DateTime NormalizeUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Unspecified)
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return value.ToUniversalTime();
    }

    private static List<BalanceAdjustmentEvent> BuildAdjustmentTimeline(
        IEnumerable<(DateTime OccurredAt, decimal Amount)> rawAdjustments,
        DateTime accountCreatedAtUtc)
    {
        var timeline = rawAdjustments
            .Select(a => new BalanceAdjustmentEvent(NormalizeUtc(a.OccurredAt), a.Amount))
            .OrderBy(a => a.OccurredAt)
            .ToList();

        if (timeline.Count == 1 && IsOpeningBalanceAnchor(accountCreatedAtUtc, timeline[0].OccurredAt))
        {
            var opening = timeline[0];
            timeline[0] = new BalanceAdjustmentEvent(OpeningBalanceAnchorUtc, opening.Amount);
        }

        return timeline;
    }

    private static bool IsOpeningBalanceAnchor(DateTime accountCreatedAtUtc, DateTime adjustmentOccurredAtUtc)
        => (adjustmentOccurredAtUtc - accountCreatedAtUtc).Duration() <= OpeningBalanceDetectionWindow;

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

    private static decimal? ComputeSimpleReturn(ReturnInputs returnInputs)
    {
        if (!returnInputs.CanCompute)
            return null;

        var components = BuildReturnComponents(
            returnInputs.StartBalance,
            returnInputs.EndBalance,
            returnInputs.CashFlows);

        if (Math.Abs(components.CapitalBase) < 0.0001m)
            return null;

        return Math.Round(components.Profit / components.CapitalBase, 4, MidpointRounding.AwayFromZero);
    }

    private static ReturnInputs ResolveReturnInputs(
        DateTime periodFrom,
        DateTime periodToExclusive,
        decimal startBalance,
        decimal endBalance,
        List<BalanceAdjustmentEvent> accountAdjustments,
        List<CashFlowEvent> periodCashFlows)
    {
        var hasAnchorAdjustment = accountAdjustments.Any(a => a.OccurredAt <= periodFrom);
        if (hasAnchorAdjustment)
            return new ReturnInputs(true, periodFrom, startBalance, endBalance, periodCashFlows);

        var firstAdjustmentInPeriod = accountAdjustments
            .FirstOrDefault(a => a.OccurredAt >= periodFrom && a.OccurredAt < periodToExclusive);
        var firstCashFlowInPeriod = periodCashFlows.FirstOrDefault();

        var hasFirstAdjustment = firstAdjustmentInPeriod.OccurredAt != default;
        var hasFirstCashFlow = firstCashFlowInPeriod.OccurredAt != default;

        if (!hasFirstAdjustment && !hasFirstCashFlow)
            return new ReturnInputs(false, periodFrom, 0m, endBalance, new List<CashFlowEvent>());

        var cashFlowStartsPeriod = !hasFirstAdjustment
            || (hasFirstCashFlow && (
                firstCashFlowInPeriod.OccurredAt <= firstAdjustmentInPeriod.OccurredAt
                || firstCashFlowInPeriod.OccurredAt.Date == firstAdjustmentInPeriod.OccurredAt.Date));

        if (cashFlowStartsPeriod)
        {
            var cashFlows = periodCashFlows
                .Where(flow => flow.OccurredAt >= firstCashFlowInPeriod.OccurredAt)
                .ToList();

            return new ReturnInputs(
                true,
                firstCashFlowInPeriod.OccurredAt,
                0m,
                endBalance,
                cashFlows);
        }

        var effectiveCashFlows = periodCashFlows
            .Where(flow => flow.OccurredAt > firstAdjustmentInPeriod.OccurredAt)
            .ToList();

        return new ReturnInputs(
            true,
            firstAdjustmentInPeriod.OccurredAt,
            firstAdjustmentInPeriod.Amount,
            endBalance,
            effectiveCashFlows);
    }

    private async Task<Dictionary<(string CurrencyCode, DateTime DayStartUtc), decimal>> BuildFxRateMapAsync(
        HashSet<(string CurrencyCode, DateTime DayStartUtc)> fxRateRequests,
        string baseCurrencyCode,
        CancellationToken ct)
    {
        var normalizedRequests = fxRateRequests
            .Where(request => !string.Equals(request.CurrencyCode, baseCurrencyCode, StringComparison.OrdinalIgnoreCase))
            .ToArray();

        var rateByCurrencyAndDay = normalizedRequests.Length == 0
            ? new Dictionary<(string CurrencyCode, DateTime DayStartUtc), decimal>()
            : await currencyConverter.GetCrossRatesAsync(normalizedRequests, baseCurrencyCode, ct);

        foreach (var request in fxRateRequests.Where(request =>
                     string.Equals(request.CurrencyCode, baseCurrencyCode, StringComparison.OrdinalIgnoreCase)))
        {
            rateByCurrencyAndDay[request] = 1m;
        }

        return rateByCurrencyAndDay;
    }

    private static decimal? ComputePortfolioReturnPercent(
        IReadOnlyDictionary<Guid, string> accountCurrencyById,
        IReadOnlyDictionary<Guid, ReturnInputs> returnInputsByAccount,
        DateTime periodToExclusive,
        string baseCurrencyCode,
        IReadOnlyDictionary<(string CurrencyCode, DateTime DayStartUtc), decimal> rateByCurrencyAndDay)
    {
        decimal totalCapitalBase = 0m;
        decimal totalProfit = 0m;
        var hasContributions = false;

        foreach (var (accountId, currencyCode) in accountCurrencyById)
        {
            if (!returnInputsByAccount.TryGetValue(accountId, out var returnInputs) || !returnInputs.CanCompute)
                continue;

            var startBalanceBase = ConvertToBaseCurrency(
                currencyCode,
                returnInputs.StartBalance,
                returnInputs.StartAt,
                baseCurrencyCode,
                rateByCurrencyAndDay);
            var endBalanceBase = ConvertToBaseCurrency(
                currencyCode,
                returnInputs.EndBalance,
                periodToExclusive.AddTicks(-1),
                baseCurrencyCode,
                rateByCurrencyAndDay);

            var convertedCashFlows = new List<CashFlowEvent>(returnInputs.CashFlows.Count);

            foreach (var flow in returnInputs.CashFlows)
            {
                convertedCashFlows.Add(new CashFlowEvent(
                    flow.OccurredAt,
                    ConvertToBaseCurrency(
                        currencyCode,
                        flow.Amount,
                        flow.OccurredAt,
                        baseCurrencyCode,
                        rateByCurrencyAndDay)));
            }

            var components = BuildReturnComponents(
                startBalanceBase,
                endBalanceBase,
                convertedCashFlows);

            if (Math.Abs(components.CapitalBase) < 0.0001m)
                continue;

            hasContributions = true;
            totalCapitalBase += components.CapitalBase;
            totalProfit += components.Profit;
        }

        if (!hasContributions || Math.Abs(totalCapitalBase) < 0.0001m)
            return null;

        return Math.Round(totalProfit / totalCapitalBase, 4, MidpointRounding.AwayFromZero);
    }

    private static ReturnComponents BuildReturnComponents(
        decimal startBalance,
        decimal endBalance,
        List<CashFlowEvent> cashFlows)
    {
        decimal totalInflows = 0m;
        decimal totalOutflows = 0m;

        foreach (var flow in cashFlows)
        {
            if (flow.Amount >= 0m)
            {
                totalInflows += flow.Amount;
            }
            else
            {
                totalOutflows += -flow.Amount;
            }
        }

        var capitalBase = startBalance + totalInflows;
        var profit = endBalance + totalOutflows - startBalance - totalInflows;

        return new ReturnComponents(capitalBase, profit);
    }

    private static decimal ConvertToBaseCurrency(
        string currencyCode,
        decimal amount,
        DateTime atUtc,
        string baseCurrencyCode,
        IReadOnlyDictionary<(string CurrencyCode, DateTime DayStartUtc), decimal> rateByCurrencyAndDay)
    {
        if (amount == 0m || string.Equals(currencyCode, baseCurrencyCode, StringComparison.OrdinalIgnoreCase))
            return amount;

        var rateKey = (currencyCode, atUtc.Date);
        if (!rateByCurrencyAndDay.TryGetValue(rateKey, out var rate))
            throw new InvalidOperationException($"FX rate not found for {currencyCode} at {atUtc:yyyy-MM-dd}.");

        return amount * rate;
    }

    private static decimal Round2(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
