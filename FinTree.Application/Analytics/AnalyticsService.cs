using FinTree.Application.Currencies;
using FinTree.Application.Users;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Analytics;

public sealed class AnalyticsService(
    AppDbContext context,
    ICurrentUser currentUserService,
    CurrencyConverter currencyConverter,
    UserService userService)
{
    public async Task<IReadOnlyList<MonthlyExpensesDto>> GetMonthlyExpensesAsync(DateTime? from = null,
        DateTime? to = null, CancellationToken ct = default)
    {
        var currentUserId = currentUserService.Id;
        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var transactionsQuery = context.ExpenseTransactions.Where(t => t.Account.UserId == currentUserId);

        if (from.HasValue)
            transactionsQuery = transactionsQuery.Where(t => t.OccurredAt >= from.Value);

        if (to.HasValue)
            transactionsQuery = transactionsQuery.Where(t => t.OccurredAt <= to.Value);

        var transactionDatas = await transactionsQuery
            .Select(t => new { t.Money, t.OccurredAt })
            .ToListAsync(cancellationToken: ct);

        var totals = new Dictionary<(int Year, int Month), decimal>();
        foreach (var r in transactionDatas)
        {
            ct.ThrowIfCancellationRequested();

            // Нормализуем дату в UTC (если Kind не задан — считаем, что это уже UTC)
            var dt = r.OccurredAt;
            var occurredUtc = (dt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
                : dt).ToUniversalTime();

            var baseMoney = await currencyConverter.ConvertAsync(
                money: r.Money,
                toCurrencyCode: baseCurrencyCode,
                atUtc: occurredUtc,
                ct: ct);

            var key = (occurredUtc.Year, occurredUtc.Month);
            if (totals.TryGetValue(key, out var sum))
                totals[key] = sum + baseMoney.Amount;
            else
                totals[key] = baseMoney.Amount;
        }

        var result = totals
            .Select(kv => new MonthlyExpensesDto(
                Year: kv.Key.Year,
                Month: kv.Key.Month,
                Day: null,
                Week: null,
                Amount: kv.Value))
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();

        return result;
    }

    public async Task<IReadOnlyList<MonthlyExpensesDto>> GetExpensesByGranularityAsync(
        string granularity, CancellationToken ct = default)
    {
        var currentUserId = currentUserService.Id;
        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var transactionsQuery = context.ExpenseTransactions.Where(t => t.Account.UserId == currentUserId);

        var transactionDatas = await transactionsQuery
            .Select(t => new { t.Money, t.OccurredAt })
            .ToListAsync(cancellationToken: ct);

        var totals = new Dictionary<string, (int Year, int Month, int? Day, int? Week, decimal Amount)>();

        foreach (var r in transactionDatas)
        {
            ct.ThrowIfCancellationRequested();

            var dt = r.OccurredAt;
            var occurredUtc = (dt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
                : dt).ToUniversalTime();

            var baseMoney = await currencyConverter.ConvertAsync(
                money: r.Money,
                toCurrencyCode: baseCurrencyCode,
                atUtc: occurredUtc,
                ct: ct);

            string key;
            (int Year, int Month, int? Day, int? Week, decimal Amount) entry;
            var baseAmount = baseMoney.Amount;

            switch (granularity.ToLower())
            {
                case "days":
                    key = $"{occurredUtc.Year}-{occurredUtc.Month}-{occurredUtc.Day}";
                    entry = (occurredUtc.Year, occurredUtc.Month, occurredUtc.Day, null, baseAmount);
                    break;
                case "weeks":
                    var weekOfYear = System.Globalization.CultureInfo.InvariantCulture.Calendar
                        .GetWeekOfYear(occurredUtc, System.Globalization.CalendarWeekRule.FirstDay, DayOfWeek.Monday);
                    key = $"{occurredUtc.Year}-W{weekOfYear}";
                    entry = (occurredUtc.Year, occurredUtc.Month, null, weekOfYear, baseAmount);
                    break;
                default:
                    key = $"{occurredUtc.Year}-{occurredUtc.Month}";
                    entry = (occurredUtc.Year, occurredUtc.Month, null, null, baseAmount);
                    break;
            }

            if (totals.TryGetValue(key, out var existing))
                totals[key] = existing with { Amount = existing.Amount + baseAmount };
            else
                totals[key] = entry;
        }

        var result = totals.Values
            .Select(v => new MonthlyExpensesDto(
                Year: v.Year,
                Month: v.Month,
                Day: v.Day,
                Week: v.Week,
                Amount: v.Amount))
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();

        return result;
    }

    public async Task<IReadOnlyList<CategoryExpenseDto>> GetExpensesByCategoryAsync(int year, int month,
        CancellationToken ct = default)
    {
        var startDate = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endDate = startDate.AddMonths(1);
        return await GetExpensesByCategoryByDateRangeAsync(startDate, endDate, ct);
    }

    public async Task<IReadOnlyList<CategoryExpenseDto>> GetExpensesByCategoryByDateRangeAsync(
        DateTime from, DateTime to, CancellationToken ct = default)
    {
        var currentUserId = currentUserService.Id;
        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var transactionsQuery = context.ExpenseTransactions.Where(t =>
            t.Account.UserId == currentUserId &&
            t.OccurredAt >= from &&
            t.OccurredAt < to);

        var transactionDatas = await transactionsQuery
            .Select(t => new
            {
                t.CategoryId,
                t.Money,
                t.OccurredAt
            })
            .ToListAsync(cancellationToken: ct);

        var userCategories =
            (await userService.GetUserCategoriesAsync(ct)).ToDictionary(c => c.Id, c => new { c.Name, c.Color });

        var categoryTotals = new Dictionary<Guid, decimal>();
        foreach (var r in transactionDatas)
        {
            ct.ThrowIfCancellationRequested();

            var dt = r.OccurredAt;
            var occurredUtc = (dt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
                : dt).ToUniversalTime();

            var baseMoney = await currencyConverter.ConvertAsync(
                money: r.Money,
                toCurrencyCode: baseCurrencyCode,
                atUtc: occurredUtc,
                ct: ct);

            var baseAmount = baseMoney.Amount;
            if (categoryTotals.TryGetValue(r.CategoryId, out var currentTotal))
                categoryTotals[r.CategoryId] = currentTotal + baseAmount;
            else
                categoryTotals[r.CategoryId] = baseAmount;
        }

        var result = categoryTotals
            .Select(kv =>
            {
                var categoryInfo = userCategories[kv.Key];
                return new CategoryExpenseDto(kv.Key, categoryInfo.Name, categoryInfo.Color, kv.Value);
            })
            .OrderByDescending(x => x.Amount)
            .ToList();

        return result;
    }

    public async Task<IReadOnlyList<NetWorthSnapshotDto>> GetNetWorthTrendAsync(DateTime? from = null,
        DateTime? to = null, CancellationToken ct = default)
    {
        var currentUserId = currentUserService.Id;
        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        // Get all user accounts
        var accounts = await context.Accounts
            .Where(a => a.UserId == currentUserId)
            .Select(a => new { a.Id, a.CurrencyCode })
            .ToListAsync(ct);

        if (accounts.Count == 0)
            return Array.Empty<NetWorthSnapshotDto>();

        // Get all transactions for the user
        var transactionsQuery = context.Transactions
            .Where(t => t.Account.UserId == currentUserId);

        if (from.HasValue)
            transactionsQuery = transactionsQuery.Where(t => t.OccurredAt >= from.Value);

        if (to.HasValue)
            transactionsQuery = transactionsQuery.Where(t => t.OccurredAt <= to.Value);

        var transactions = await transactionsQuery
            .OrderBy(t => t.OccurredAt)
            .Select(t => new { t.AccountId, t.Money, t.OccurredAt })
            .ToListAsync(ct);

        if (transactions.Count == 0)
            return Array.Empty<NetWorthSnapshotDto>();

        // Calculate running balances per account per month
        var accountBalances = accounts.ToDictionary(a => a.Id, _ => 0m);
        var monthlySnapshots = new Dictionary<(int Year, int Month), decimal>();

        // Group transactions by month
        var transactionsByMonth = transactions
            .GroupBy(t =>
            {
                var dt = t.OccurredAt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(t.OccurredAt, DateTimeKind.Utc)
                    : t.OccurredAt.ToUniversalTime();
                return (dt.Year, dt.Month);
            })
            .OrderBy(g => g.Key.Year)
            .ThenBy(g => g.Key.Month);

        foreach (var monthGroup in transactionsByMonth)
        {
            ct.ThrowIfCancellationRequested();

            // Process all transactions in this month
            foreach (var txn in monthGroup)
            {
                var dt = txn.OccurredAt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(txn.OccurredAt, DateTimeKind.Utc)
                    : txn.OccurredAt.ToUniversalTime();

                var baseMoney = await currencyConverter.ConvertAsync(
                    money: txn.Money,
                    toCurrencyCode: baseCurrencyCode,
                    atUtc: dt,
                    ct: ct);
                
                // Withdrawal transactions have negative money amount
                accountBalances[txn.AccountId] -= baseMoney.Amount;
            }

            // Calculate total networth at end of this month
            var totalNetWorth = accountBalances.Values.Sum();
            monthlySnapshots[monthGroup.Key] = totalNetWorth;
        }

        var result = monthlySnapshots
            .Select(kv => new NetWorthSnapshotDto(
                Year: kv.Key.Year,
                Month: kv.Key.Month,
                TotalBalance: kv.Value))
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();

        return result;
    }
}
