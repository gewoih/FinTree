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
    private readonly record struct CategoryMeta(string Name, string Color, bool IsMandatory);

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
            for (var monthCursor = periodStartUtc;
                 monthCursor <= currentMonthStart;
                 monthCursor = monthCursor.AddMonths(1))
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

    public async Task<CashflowSummaryDto> GetCashflowSummaryAsync(int year, int month, CancellationToken ct = default)
    {
        var currentUserId = currentUserService.Id;
        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var startUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endUtc = startUtc.AddMonths(1);

        var transactionDatas = await context.Transactions
            .Where(t => t.Account.UserId == currentUserId &&
                        t.OccurredAt >= startUtc &&
                        t.OccurredAt < endUtc)
            .Select(t => new { t.Money, t.OccurredAt, t.Type })
            .ToListAsync(ct);

        var totalIncome = 0m;
        var totalExpenses = 0m;

        foreach (var txn in transactionDatas)
        {
            ct.ThrowIfCancellationRequested();

            var baseMoney = await currencyConverter.ConvertAsync(
                money: txn.Money,
                toCurrencyCode: baseCurrencyCode,
                atUtc: txn.OccurredAt,
                ct: ct);

            if (txn.Type == TransactionType.Income)
                totalIncome += baseMoney.Amount;
            else
                totalExpenses += baseMoney.Amount;
        }

        var netCashflow = totalIncome - totalExpenses;
        var savingsRate = totalIncome > 0m ? netCashflow / totalIncome : (decimal?)null;

        return new CashflowSummaryDto(
            year,
            month,
            Math.Round(totalIncome, 2, MidpointRounding.AwayFromZero),
            Math.Round(totalExpenses, 2, MidpointRounding.AwayFromZero),
            Math.Round(netCashflow, 2, MidpointRounding.AwayFromZero),
            savingsRate);
    }

    public async Task<AnalyticsDashboardDto> GetDashboardAsync(int year, int month, CancellationToken ct = default)
    {
        var currentUserId = currentUserService.Id;
        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var monthStartUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEndUtc = monthStartUtc.AddMonths(1);
        var previousMonthStartUtc = monthStartUtc.AddMonths(-1);

        var categories = (await userService.GetUserCategoriesAsync(ct))
            .ToDictionary(c => c.Id, c => new CategoryMeta(c.Name, c.Color, c.IsMandatory));

        var transactions = await context.Transactions
            .Where(t => t.Account.UserId == currentUserId &&
                        t.OccurredAt >= previousMonthStartUtc &&
                        t.OccurredAt < monthEndUtc)
            .Select(t => new { t.CategoryId, t.Money, t.OccurredAt, t.Type })
            .ToListAsync(ct);

        var dailyTotals = new Dictionary<DateOnly, decimal>();
        var currentCategoryTotals = new Dictionary<Guid, decimal>();
        var previousCategoryTotals = new Dictionary<Guid, decimal>();

        decimal totalIncome = 0m;
        decimal totalExpenses = 0m;
        decimal previousMonthExpenses = 0m;
        decimal discretionaryTotal = 0m;

        foreach (var txn in transactions)
        {
            ct.ThrowIfCancellationRequested();

            var occurredUtc = txn.OccurredAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(txn.OccurredAt, DateTimeKind.Utc)
                : txn.OccurredAt.ToUniversalTime();

            var baseMoney = await currencyConverter.ConvertAsync(
                money: txn.Money,
                toCurrencyCode: baseCurrencyCode,
                atUtc: occurredUtc,
                ct: ct);

            var amount = baseMoney.Amount;
            var isCurrentMonth = occurredUtc >= monthStartUtc && occurredUtc < monthEndUtc;
            var isPreviousMonth = occurredUtc >= previousMonthStartUtc && occurredUtc < monthStartUtc;

            if (txn.Type == TransactionType.Income)
            {
                if (isCurrentMonth)
                    totalIncome += amount;
                continue;
            }

            if (isCurrentMonth)
            {
                totalExpenses += amount;
                var dateKey = DateOnly.FromDateTime(occurredUtc);
                if (dailyTotals.TryGetValue(dateKey, out var current))
                    dailyTotals[dateKey] = current + amount;
                else
                    dailyTotals[dateKey] = amount;

                if (currentCategoryTotals.TryGetValue(txn.CategoryId, out var categoryTotal))
                    currentCategoryTotals[txn.CategoryId] = categoryTotal + amount;
                else
                    currentCategoryTotals[txn.CategoryId] = amount;

                if (categories.TryGetValue(txn.CategoryId, out var category) && !category.IsMandatory)
                    discretionaryTotal += amount;
            }

            if (isPreviousMonth)
            {
                previousMonthExpenses += amount;
                if (previousCategoryTotals.TryGetValue(txn.CategoryId, out var previousTotal))
                    previousCategoryTotals[txn.CategoryId] = previousTotal + amount;
                else
                    previousCategoryTotals[txn.CategoryId] = amount;
            }
        }

        var dailyValues = dailyTotals.Values.Where(v => v > 0).ToList();
        var meanDaily = dailyValues.Count > 0 ? dailyValues.Average() : (decimal?)null;
        var medianDaily = dailyValues.Count > 0 ? ComputeMedian(dailyValues) : null;
        var netCashflow = totalIncome - totalExpenses;
        var savingsRate = totalIncome > 0m ? netCashflow / totalIncome : (decimal?)null;
        var discretionaryShare = totalExpenses > 0m ? (discretionaryTotal / totalExpenses) * 100 : (decimal?)null;
        var monthOverMonth = previousMonthExpenses > 0m
            ? ((totalExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
            : (decimal?)null;

        var peaks = BuildPeakDays(dailyTotals, medianDaily, totalExpenses);

        var categoryItems = currentCategoryTotals.Select(kv =>
        {
            if (!categories.TryGetValue(kv.Key, out var info))
                info = new CategoryMeta("Без категории", "#9e9e9e", false);
            var percent = totalExpenses > 0m ? (kv.Value / totalExpenses) * 100 : (decimal?)null;
            return new CategoryBreakdownItemDto(kv.Key, info.Name, info.Color, kv.Value, percent, info.IsMandatory);
        }).OrderByDescending(x => x.Amount).ToList();

        var categoryDelta = BuildCategoryDelta(currentCategoryTotals, previousCategoryTotals, categories);

        var spending = BuildSpendingBreakdown(dailyTotals, year, month, totalExpenses);

        var forecast = await BuildForecastAsync(year, month, dailyTotals, previousMonthExpenses, baseCurrencyCode, ct);

        var health = new FinancialHealthSummaryDto(
            MonthTotal: Round2(totalExpenses),
            MeanDaily: meanDaily.HasValue ? Round2(meanDaily.Value) : null,
            MedianDaily: medianDaily.HasValue ? Round2(medianDaily.Value) : null,
            SavingsRate: savingsRate,
            NetCashflow: Round2(netCashflow),
            DiscretionaryTotal: Round2(discretionaryTotal),
            DiscretionarySharePercent: discretionaryShare,
            MonthOverMonthChangePercent: monthOverMonth);

        return new AnalyticsDashboardDto(
            year,
            month,
            health,
            peaks.Summary,
            peaks.Days,
            new CategoryBreakdownDto(categoryItems, categoryDelta),
            spending,
            forecast);
    }

    private static decimal Round2(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private static decimal? ComputeMedian(IReadOnlyList<decimal> values)
    {
        if (values.Count == 0) return null;
        var sorted = values.OrderBy(v => v).ToList();
        var mid = sorted.Count / 2;
        return sorted.Count % 2 == 0
            ? (sorted[mid - 1] + sorted[mid]) / 2m
            : sorted[mid];
    }

    private static (PeakDaysSummaryDto Summary, List<PeakDayDto> Days) BuildPeakDays(
        Dictionary<DateOnly, decimal> dailyTotals,
        decimal? medianDaily,
        decimal monthTotal)
    {
        if (!medianDaily.HasValue || medianDaily.Value <= 0m || monthTotal <= 0m)
        {
            return (new PeakDaysSummaryDto(0, 0m, null, monthTotal), new List<PeakDayDto>());
        }

        var threshold = medianDaily.Value * 2m;
        var peakDays = dailyTotals
            .Where(kv => kv.Value >= threshold)
            .Select(kv =>
            {
                var share = (kv.Value / monthTotal) * 100m;
                return new PeakDayDto(kv.Key.Year, kv.Key.Month, kv.Key.Day, Round2(kv.Value), share);
            })
            .OrderByDescending(x => x.Amount)
            .ToList();

        var total = peakDays.Sum(x => x.Amount);
        var sharePercent = total > 0m ? (total / monthTotal) * 100m : (decimal?)null;

        return (new PeakDaysSummaryDto(peakDays.Count, Round2(total), sharePercent, monthTotal), peakDays);
    }

    private static CategoryDeltaDto BuildCategoryDelta(
        Dictionary<Guid, decimal> currentTotals,
        Dictionary<Guid, decimal> previousTotals,
        Dictionary<Guid, CategoryMeta> categories)
    {
        var allIds = new HashSet<Guid>(currentTotals.Keys);
        foreach (var id in previousTotals.Keys)
            allIds.Add(id);

        var entries = new List<CategoryDeltaItemDto>();
        foreach (var id in allIds)
        {
            var current = currentTotals.TryGetValue(id, out var currentValue) ? currentValue : 0m;
            var previous = previousTotals.TryGetValue(id, out var previousValue) ? previousValue : 0m;
            if (current == 0m && previous == 0m) continue;

            var delta = current - previous;
            var deltaPercent = previous > 0m ? (delta / previous) * 100m : (decimal?)null;
            if (!categories.TryGetValue(id, out var info))
                info = new CategoryMeta("Без категории", "#9e9e9e", false);

            entries.Add(new CategoryDeltaItemDto(
                id,
                info.Name,
                info.Color,
                Round2(current),
                Round2(previous),
                Round2(delta),
                deltaPercent));
        }

        var increased = entries
            .Where(x => x.DeltaAmount > 0)
            .OrderByDescending(x => x.DeltaAmount)
            .Take(4)
            .ToList();
        var decreased = entries
            .Where(x => x.DeltaAmount < 0)
            .OrderBy(x => x.DeltaAmount)
            .Take(4)
            .ToList();

        return new CategoryDeltaDto(increased, decreased);
    }

    private static SpendingBreakdownDto BuildSpendingBreakdown(
        Dictionary<DateOnly, decimal> dailyTotals,
        int year,
        int month,
        decimal monthTotal)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);

        var days = new List<MonthlyExpensesDto>(daysInMonth);
        var weeks = new Dictionary<int, decimal>();

        for (var day = 1; day <= daysInMonth; day++)
        {
            var date = new DateOnly(year, month, day);
            var amount = dailyTotals.TryGetValue(date, out var value) ? value : 0m;
            days.Add(new MonthlyExpensesDto(year, month, day, null, Round2(amount)));

            var dateTime = new DateTime(year, month, day, 0, 0, 0, DateTimeKind.Utc);
            var weekOfYear = System.Globalization.CultureInfo.InvariantCulture.Calendar
                .GetWeekOfYear(dateTime, System.Globalization.CalendarWeekRule.FirstDay, DayOfWeek.Monday);
            if (weeks.TryGetValue(weekOfYear, out var weekTotal))
                weeks[weekOfYear] = weekTotal + amount;
            else
                weeks[weekOfYear] = amount;
        }

        var weeksResult = weeks
            .Select(kv => new MonthlyExpensesDto(year, month, null, kv.Key, Round2(kv.Value)))
            .OrderBy(x => x.Week)
            .ToList();

        var months = new List<MonthlyExpensesDto>
        {
            new MonthlyExpensesDto(year, month, null, null, Round2(monthTotal))
        };

        return new SpendingBreakdownDto(days, weeksResult, months);
    }

    private async Task<ForecastDto> BuildForecastAsync(
        int year,
        int month,
        Dictionary<DateOnly, decimal> dailyTotals,
        decimal previousMonthTotal,
        string baseCurrencyCode,
        CancellationToken ct)
    {
        var nowUtc = DateTime.UtcNow;
        var monthStartUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEndUtc = monthStartUtc.AddMonths(1);
        var isCurrentMonth = monthStartUtc.Year == nowUtc.Year && monthStartUtc.Month == nowUtc.Month;
        var lastDate = isCurrentMonth ? nowUtc.Date : monthEndUtc.AddDays(-1).Date;

        var forecastEnd = new DateTime(lastDate.Year, lastDate.Month, lastDate.Day, 0, 0, 0, DateTimeKind.Utc);
        var forecastStart = forecastEnd.AddDays(-89);

        var forecastTransactions = await context.Transactions
            .Where(t => t.Account.UserId == currentUserService.Id &&
                        t.Type == TransactionType.Expense &&
                        t.OccurredAt >= forecastStart &&
                        t.OccurredAt <= forecastEnd)
            .Select(t => new { t.Money, t.OccurredAt })
            .ToListAsync(ct);

        var forecastDailyTotals = new Dictionary<DateOnly, decimal>();
        foreach (var txn in forecastTransactions)
        {
            ct.ThrowIfCancellationRequested();

            var occurredUtc = txn.OccurredAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(txn.OccurredAt, DateTimeKind.Utc)
                : txn.OccurredAt.ToUniversalTime();

            var baseMoney = await currencyConverter.ConvertAsync(
                money: txn.Money,
                toCurrencyCode: baseCurrencyCode,
                atUtc: occurredUtc,
                ct: ct);

            var dateKey = DateOnly.FromDateTime(occurredUtc);
            if (forecastDailyTotals.TryGetValue(dateKey, out var current))
                forecastDailyTotals[dateKey] = current + baseMoney.Amount;
            else
                forecastDailyTotals[dateKey] = baseMoney.Amount;
        }

        var medianDaily = ComputeMedian(forecastDailyTotals.Values.Where(v => v > 0).ToList());
        var daysInMonth = DateTime.DaysInMonth(year, month);

        var days = new List<int>(daysInMonth);
        var actual = new List<decimal?>(daysInMonth);
        var forecast = new List<decimal?>(daysInMonth);
        var baseline = new List<decimal?>(daysInMonth);

        decimal cumulative = 0m;
        for (var day = 1; day <= daysInMonth; day++)
        {
            days.Add(day);
            var dateKey = new DateOnly(year, month, day);
            var dayAmount = dailyTotals.TryGetValue(dateKey, out var value) ? value : 0m;
            cumulative += dayAmount;

            if (isCurrentMonth && day > nowUtc.Day)
                actual.Add(null);
            else
                actual.Add(Round2(cumulative));

            forecast.Add(medianDaily.HasValue ? Round2(medianDaily.Value * day) : null);
            baseline.Add(previousMonthTotal > 0m ? Round2(previousMonthTotal) : null);
        }

        var currentSpent = actual.LastOrDefault(v => v.HasValue) ?? Round2(cumulative);
        decimal? forecastTotal = medianDaily.HasValue ? Round2(medianDaily.Value * daysInMonth) : null;
        var baselineLimit = previousMonthTotal > 0m ? Round2(previousMonthTotal) : (decimal?)null;

        string? status = null;
        if (baselineLimit.HasValue && forecastTotal.HasValue)
        {
            status = forecastTotal <= baselineLimit * 0.9m
                ? "good"
                : forecastTotal <= baselineLimit * 1.05m
                    ? "average"
                    : "poor";
        }

        var summary = new ForecastSummaryDto(forecastTotal, currentSpent, baselineLimit, status);
        var series = new ForecastSeriesDto(days, actual, forecast, baseline);
        return new ForecastDto(summary, series);
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
            (await userService.GetUserCategoriesAsync(ct))
            .ToDictionary(c => c.Id, c => new { c.Name, c.Color, c.IsMandatory });

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
                return new CategoryExpenseDto(kv.Key, categoryInfo.Name, categoryInfo.Color, kv.Value,
                    categoryInfo.IsMandatory);
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

    public async Task<FutureIncomeOverviewDto> GetFutureIncomeOverviewAsync(CancellationToken ct = default)
    {
        var currentUserId = currentUserService.Id;
        var nowUtc = DateTime.UtcNow;

        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        SalaryProjectionDto? salaryProjection = null;

        var instruments = await context.IncomeInstruments
            .AsNoTracking()
            .Where(i => i.UserId == currentUserId)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync(ct);

        var instrumentProjections = new List<IncomeInstrumentProjectionDto>(instruments.Count);

        foreach (var instrument in instruments)
        {
            ct.ThrowIfCancellationRequested();

            var principalMoney = new Money(instrument.CurrencyCode, instrument.PrincipalAmount);
            var principalInBase = await currencyConverter.ConvertAsync(principalMoney, baseCurrencyCode, nowUtc, ct);

            decimal? contributionInBase = null;
            if (instrument.MonthlyContribution is { } contribution && contribution > 0m)
            {
                var contributionMoney = new Money(instrument.CurrencyCode, contribution);
                contributionInBase =
                    (await currencyConverter.ConvertAsync(contributionMoney, baseCurrencyCode, nowUtc, ct)).Amount;
            }

            var expectedAnnualIncome = instrument.CalculateExpectedAnnualIncome();
            var expectedMonthlyIncome = expectedAnnualIncome / 12m;

            decimal expectedAnnualIncomeInBase;
            decimal expectedMonthlyIncomeInBase;
            switch (instrument.InstrumentType)
            {
                case IncomeInstrumentType.Salary:
                {
                    var monthlyInBase = principalInBase.Amount;
                    expectedMonthlyIncomeInBase = monthlyInBase;
                    expectedAnnualIncomeInBase = monthlyInBase * 12m;
                    break;
                }

                default:
                {
                    var r = instrument.ExpectedAnnualYieldRate;
                    if (r <= 0m)
                    {
                        expectedAnnualIncomeInBase = 0m;
                        expectedMonthlyIncomeInBase = 0m;
                    }
                    else
                    {
                        var interestOnPrincipalBase = principalInBase.Amount * r;
                        var interestOnContribsBase = (contributionInBase ?? 0m) * 12m * r * 0.5m;

                        expectedAnnualIncomeInBase = interestOnPrincipalBase + interestOnContribsBase;
                        expectedMonthlyIncomeInBase = expectedAnnualIncomeInBase / 12m;
                    }

                    break;
                }
            }

            instrumentProjections.Add(new IncomeInstrumentProjectionDto(
                Id: instrument.Id,
                Name: instrument.Name,
                Type: instrument.InstrumentType,
                OriginalCurrencyCode: instrument.CurrencyCode,
                PrincipalAmount: instrument.PrincipalAmount,
                ExpectedAnnualYieldRate: instrument.ExpectedAnnualYieldRate,
                MonthlyContribution: instrument.MonthlyContribution,
                ExpectedMonthlyIncome: R2(expectedMonthlyIncome),
                ExpectedAnnualIncome: R2(expectedAnnualIncome),
                PrincipalAmountInBaseCurrency: R2(principalInBase.Amount),
                MonthlyContributionInBaseCurrency: contributionInBase is null ? null : R2(contributionInBase.Value),
                ExpectedMonthlyIncomeInBaseCurrency: R2(expectedMonthlyIncomeInBase),
                ExpectedAnnualIncomeInBaseCurrency: R2(expectedAnnualIncomeInBase)
            ));
            continue;

            decimal R2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
        }

        var salaryMonthly = salaryProjection?.MonthlyAverage ?? 0m;
        var instrumentsMonthly = instrumentProjections.Sum(i => i.ExpectedMonthlyIncomeInBaseCurrency);
        var totalMonthly = salaryMonthly + instrumentsMonthly;
        var totalAnnual = totalMonthly * 12m;

        return new FutureIncomeOverviewDto(
            BaseCurrencyCode: baseCurrencyCode,
            Salary: salaryProjection,
            Instruments: instrumentProjections,
            TotalExpectedMonthlyIncome: Math.Round(totalMonthly, 2, MidpointRounding.AwayFromZero),
            TotalExpectedAnnualIncome: Math.Round(totalAnnual, 2, MidpointRounding.AwayFromZero)
        );
    }


    private readonly record struct NormalizedTransaction(
        DateTime OccurredAt,
        decimal Amount,
        bool IsIncome,
        bool IsMandatory,
        Guid CategoryId,
        AccountType AccountType);
}
