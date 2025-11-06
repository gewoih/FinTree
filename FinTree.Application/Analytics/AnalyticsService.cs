using FinTree.Application.Currencies;
using FinTree.Application.Users;
using FinTree.Domain.Accounts;
using FinTree.Domain.IncomeStreams;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Analytics;

public sealed class AnalyticsService(
    AppDbContext context,
    ICurrentUser currentUserService,
    CurrencyConverter currencyConverter,
    UserService userService)
{
    private static readonly HashSet<int> SupportedPeriods = new() { 1, 3, 6, 12 };
    private static readonly HashSet<AccountType> LiquidAccountTypes = new() { AccountType.Bank, AccountType.Cash };

    public async Task<FinancialHealthMetricsDto> GetFinancialHealthMetricsAsync(
        int periodMonths,
        CancellationToken ct = default)
    {
        if (!SupportedPeriods.Contains(periodMonths))
            throw new ArgumentOutOfRangeException(nameof(periodMonths),
                "Supported periods: 1, 3, 6 and 12 months.");

        var currentUserId = currentUserService.Id;
        var nowUtc = DateTime.UtcNow;
        var currentMonthStart = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var periodStartUtc = currentMonthStart.AddMonths(1 - periodMonths);

        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var rawTransactions = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserId &&
                        t.OccurredAt >= periodStartUtc &&
                        t.OccurredAt <= nowUtc)
            .Select(t => new
            {
                t.Money,
                t.OccurredAt,
                t.Type,
                t.IsMandatory,
                t.CategoryId,
                AccountType = t.Account.Type
            })
            .ToListAsync(ct);

        if (rawTransactions.Count == 0)
            return new FinancialHealthMetricsDto(periodMonths, null, null, null, null);

        var normalizedTransactions = new List<NormalizedTransaction>(rawTransactions.Count);

        foreach (var txn in rawTransactions)
        {
            ct.ThrowIfCancellationRequested();

            var occurredAt = txn.OccurredAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(txn.OccurredAt, DateTimeKind.Utc)
                : txn.OccurredAt.ToUniversalTime();

            if (occurredAt < periodStartUtc || occurredAt > nowUtc)
                continue;

            var baseMoney = await currencyConverter.ConvertAsync(
                money: txn.Money,
                toCurrencyCode: baseCurrencyCode,
                atUtc: occurredAt,
                ct: ct);

            var isIncome = txn.Type == TransactionType.Income;

            normalizedTransactions.Add(new NormalizedTransaction(
                OccurredAt: occurredAt,
                Amount: baseMoney.Amount,
                IsIncome: isIncome,
                IsMandatory: txn.IsMandatory,
                CategoryId: txn.CategoryId,
                AccountType: txn.AccountType));
        }

        if (normalizedTransactions.Count == 0)
            return new FinancialHealthMetricsDto(periodMonths, null, null, null, null);

        var incomeTransactions = normalizedTransactions.Where(t => t.IsIncome).ToList();
        var expenseTransactions = normalizedTransactions.Where(t => !t.IsIncome).ToList();

        var totalIncome = incomeTransactions.Sum(t => t.Amount);
        var totalExpenses = expenseTransactions.Sum(t => t.Amount);

        decimal? savingsRate = null;
        if (totalIncome > 0m)
            savingsRate = (totalIncome - totalExpenses) / totalIncome;

        var mandatoryExpenses = expenseTransactions
            .Where(t => t.IsMandatory)
            .Sum(t => t.Amount);

        var liquidTransactions = normalizedTransactions
            .Where(t => LiquidAccountTypes.Contains(t.AccountType))
            .ToList();

        var liquidAssets = liquidTransactions.Sum(t => t.IsIncome ? t.Amount : -t.Amount);

        decimal? liquidityMonths = null;
        if (periodMonths > 0)
        {
            var avgEssentialMonthly = mandatoryExpenses / periodMonths;
            if (avgEssentialMonthly > 0m)
                liquidityMonths = liquidAssets / avgEssentialMonthly;
        }

        decimal? expenseVolatility = null;
        {
            var expenseByMonth = expenseTransactions
                .GroupBy(t => new DateTime(t.OccurredAt.Year, t.OccurredAt.Month, 1, 0, 0, 0, DateTimeKind.Utc))
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

            var monthlyValues = new List<decimal>();
            for (var monthCursor = periodStartUtc; monthCursor <= currentMonthStart; monthCursor = monthCursor.AddMonths(1))
            {
                if (!expenseByMonth.TryGetValue(monthCursor, out var value))
                    value = 0m;

                monthlyValues.Add(value);
            }

            if (monthlyValues.Count > 0)
            {
                var average = monthlyValues.Average();
                if (average > 0m)
                {
                    var variance = monthlyValues.Average(v =>
                    {
                        var diff = v - average;
                        return diff * diff;
                    });

                    var stdDeviation = Math.Sqrt((double)variance);
                    expenseVolatility = (decimal)(stdDeviation / (double)average);
                }
                else
                {
                    expenseVolatility = 0m;
                }
            }
        }

        decimal? incomeDiversity = null;
        if (totalIncome > 0m)
        {
            var incomeByCategory = incomeTransactions
                .GroupBy(t => t.CategoryId)
                .Select(g => g.Sum(x => x.Amount))
                .ToList();

            if (incomeByCategory.Count > 0)
            {
                var largestShare = incomeByCategory.Max();
                incomeDiversity = largestShare / totalIncome;
            }
        }

        return new FinancialHealthMetricsDto(
            PeriodMonths: periodMonths,
            SavingsRate: savingsRate,
            LiquidityMonths: liquidityMonths,
            ExpenseVolatility: expenseVolatility,
            IncomeDiversity: incomeDiversity);
    }

    public async Task<IReadOnlyList<MonthlyExpensesDto>> GetMonthlyExpensesAsync(DateTime? from = null,
        DateTime? to = null, CancellationToken ct = default)
    {
        var currentUserId = currentUserService.Id;
        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var transactionsQuery = context.Transactions.Where(t => 
            t.Type == TransactionType.Expense &&
            t.Account.UserId == currentUserId);

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

        var transactionsQuery = context.Transactions.Where(t => 
            t.Type == TransactionType.Expense &&
            t.Account.UserId == currentUserId);

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

        var transactionsQuery = context.Transactions.Where(t =>
            t.Type == TransactionType.Expense &&
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
            .Select(t => new { t.AccountId, t.Money, t.OccurredAt, t.Type })
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
                
                switch (txn.Type)
                {
                    case TransactionType.Income:
                        accountBalances[txn.AccountId] += baseMoney.Amount;
                        break;
                    case TransactionType.Expense:
                        accountBalances[txn.AccountId] -= baseMoney.Amount;
                        break;
                    default:
                        throw new ArgumentOutOfRangeException();
                }
            }

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

    public async Task<FutureIncomeOverviewDto> GetFutureIncomeOverviewAsync(int salaryLookbackMonths = 6,
        CancellationToken ct = default)
    {
        if (salaryLookbackMonths <= 0)
            throw new ArgumentOutOfRangeException(nameof(salaryLookbackMonths));

        var currentUserId = currentUserService.Id;
        var nowUtc = DateTime.UtcNow;
        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var currentMonthStart = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var salaryPeriodStart = currentMonthStart.AddMonths(1 - salaryLookbackMonths);

        var incomeTransactions = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserId &&
                        t.Type == TransactionType.Income &&
                        t.OccurredAt >= salaryPeriodStart &&
                        t.OccurredAt <= nowUtc)
            .Join(context.TransactionCategories.AsNoTracking(),
                t => t.CategoryId,
                c => c.Id,
                (t, c) => new
                {
                    t.Money,
                    t.OccurredAt,
                    CategoryName = c.Name
                })
            .ToListAsync(ct);

        var normalizedIncome = new List<(DateTime OccurredAt, decimal Amount, string CategoryName)>();
        foreach (var income in incomeTransactions)
        {
            ct.ThrowIfCancellationRequested();

            var occurredAt = income.OccurredAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(income.OccurredAt, DateTimeKind.Utc)
                : income.OccurredAt.ToUniversalTime();

            var baseMoney = await currencyConverter.ConvertAsync(
                income.Money,
                baseCurrencyCode,
                occurredAt,
                ct);

            var categoryName = string.IsNullOrWhiteSpace(income.CategoryName)
                ? "Доход"
                : income.CategoryName;

            normalizedIncome.Add((occurredAt, baseMoney.Amount, categoryName));
        }

        var monthsConsidered = Math.Max(1, salaryLookbackMonths);
        SalaryProjectionDto? salaryProjection = null;
        if (normalizedIncome.Count > 0)
        {
            var totalIncome = normalizedIncome.Sum(x => x.Amount);
            var monthlyAverage = totalIncome / monthsConsidered;

            var sources = normalizedIncome
                .GroupBy(x => x.CategoryName)
                .Select(g =>
                {
                    var total = g.Sum(x => x.Amount);
                    var monthly = total / monthsConsidered;
                    var annual = monthly * 12m;
                    var share = totalIncome > 0m ? total / totalIncome : 0m;
                    return new IncomeBreakdownDto(g.Key, monthly, annual, share);
                })
                .OrderByDescending(x => x.MonthlyAmount)
                .ToList();

            salaryProjection = new SalaryProjectionDto(
                MonthlyAverage: monthlyAverage,
                AnnualProjection: monthlyAverage * 12m,
                Sources: sources);
        }

        var instruments = await context.IncomeInstruments
            .AsNoTracking()
            .Where(i => i.UserId == currentUserId)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync(ct);

        var instrumentProjections = new List<IncomeInstrumentProjectionDto>(instruments.Count);

        foreach (var instrument in instruments)
        {
            ct.ThrowIfCancellationRequested();

            var asOfUtc = nowUtc;

            var principalMoney = new Money(instrument.CurrencyCode, instrument.PrincipalAmount);
            var principalInBase = await currencyConverter.ConvertAsync(principalMoney, baseCurrencyCode, asOfUtc, ct);

            decimal? contributionInBase = null;
            if (instrument.MonthlyContribution is { } contribution && contribution > 0m)
            {
                var contributionMoney = new Money(instrument.CurrencyCode, contribution);
                var converted = await currencyConverter.ConvertAsync(contributionMoney, baseCurrencyCode, asOfUtc, ct);
                contributionInBase = converted.Amount;
            }

            var expectedAnnualIncome = instrument.CalculateExpectedAnnualIncome();
            var expectedMonthlyIncome = expectedAnnualIncome / 12m;

            var expectedAnnualIncomeInBase = principalInBase.Amount * instrument.ExpectedAnnualYieldRate
                                              + (contributionInBase ?? 0m) * 12m;
            var expectedMonthlyIncomeInBase = expectedAnnualIncomeInBase / 12m;

            instrumentProjections.Add(new IncomeInstrumentProjectionDto(
                Id: instrument.Id,
                Name: instrument.Name,
                Type: instrument.InstrumentType,
                OriginalCurrencyCode: instrument.CurrencyCode,
                PrincipalAmount: instrument.PrincipalAmount,
                ExpectedAnnualYieldRate: instrument.ExpectedAnnualYieldRate,
                MonthlyContribution: instrument.MonthlyContribution,
                ExpectedMonthlyIncome: expectedMonthlyIncome,
                ExpectedAnnualIncome: expectedAnnualIncome,
                PrincipalAmountInBaseCurrency: principalInBase.Amount,
                MonthlyContributionInBaseCurrency: contributionInBase,
                ExpectedMonthlyIncomeInBaseCurrency: expectedMonthlyIncomeInBase,
                ExpectedAnnualIncomeInBaseCurrency: expectedAnnualIncomeInBase));
        }

        var salaryMonthly = salaryProjection?.MonthlyAverage ?? 0m;
        var instrumentsMonthly = instrumentProjections.Sum(i => i.ExpectedMonthlyIncomeInBaseCurrency);
        var totalMonthly = salaryMonthly + instrumentsMonthly;
        var totalAnnual = totalMonthly * 12m;

        return new FutureIncomeOverviewDto(
            BaseCurrencyCode: baseCurrencyCode,
            Salary: salaryProjection,
            Instruments: instrumentProjections,
            TotalExpectedMonthlyIncome: totalMonthly,
            TotalExpectedAnnualIncome: totalAnnual);
    }

    private readonly record struct NormalizedTransaction(
        DateTime OccurredAt,
        decimal Amount,
        bool IsIncome,
        bool IsMandatory,
        Guid CategoryId,
        AccountType AccountType);
}
