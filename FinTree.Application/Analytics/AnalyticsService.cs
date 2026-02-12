using FinTree.Application.Abstractions;
using FinTree.Application.Exceptions;
using FinTree.Application.Currencies;
using FinTree.Application.Accounts;
using FinTree.Application.Users;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Analytics;

public sealed class AnalyticsService(
    IAppDbContext context,
    ICurrentUser currentUserService,
    CurrencyConverter currencyConverter,
    UserService userService,
    AccountsService accountsService)
{
    private readonly record struct CategoryMeta(string Name, string Color, bool IsMandatory);

    public async Task<AnalyticsDashboardDto> GetDashboardAsync(int year, int month, CancellationToken ct = default)
    {
        ValidateYearMonth(year, month);

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
                        !t.IsTransfer &&
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
        decimal? meanMedianRatio = null;
        if (meanDaily.HasValue && medianDaily is > 0m)
            meanMedianRatio = meanDaily.Value / medianDaily.Value;

        var netCashflow = totalIncome - totalExpenses;
        var savingsRate = totalIncome > 0m ? netCashflow / totalIncome : (decimal?)null;
        var discretionaryShare = totalExpenses > 0m ? (discretionaryTotal / totalExpenses) * 100 : (decimal?)null;
        var monthOverMonth = previousMonthExpenses > 0m
            ? (totalExpenses - previousMonthExpenses) / previousMonthExpenses * 100
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

        var (liquidAssets, liquidMonths, liquidStatus) = await BuildLiquidMetricsAsync(
            baseCurrencyCode,
            monthStartUtc,
            monthEndUtc,
            ct);

        var health = new FinancialHealthSummaryDto(
            MonthIncome: Round2(totalIncome),
            MonthTotal: Round2(totalExpenses),
            MeanDaily: meanDaily.HasValue ? Round2(meanDaily.Value) : null,
            MedianDaily: medianDaily.HasValue ? Round2(medianDaily.Value) : null,
            MeanMedianRatio: meanMedianRatio.HasValue ? Round2(meanMedianRatio.Value) : null,
            SavingsRate: savingsRate,
            NetCashflow: Round2(netCashflow),
            DiscretionaryTotal: Round2(discretionaryTotal),
            DiscretionarySharePercent: discretionaryShare,
            MonthOverMonthChangePercent: monthOverMonth,
            LiquidAssets: Round2(liquidAssets),
            LiquidMonths: liquidMonths,
            LiquidMonthsStatus: liquidStatus);

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

    public async Task<List<NetWorthSnapshotDto>> GetNetWorthTrendAsync(int months = 12, CancellationToken ct = default)
    {
        if (months <= 0)
            return [];
        if (months > 120)
            months = 120;

        var currentUserId = currentUserService.Id;
        var userMeta = await context.Users
            .AsNoTracking()
            .Where(u => u.Id == currentUserId)
            .Select(u => new { u.BaseCurrencyCode })
            .SingleAsync(ct);

        var accounts = await context.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == currentUserId)
            .Select(a => new { a.Id, a.CurrencyCode })
            .ToListAsync(ct);

        if (accounts.Count == 0)
        {
            return BuildEmptyNetWorth(months);
        }

        var nowUtc = DateTime.UtcNow;
        var startMonthUtc = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc)
            .AddMonths(-(months - 1));

        var distinctAccountCurrencies = accounts
            .Select(a => a.CurrencyCode)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var rawTransactions = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserId)
            .Select(t => new { t.AccountId, t.Money, t.OccurredAt, t.Type })
            .ToListAsync(ct);

        var rawAdjustments = await context.AccountBalanceAdjustments
            .AsNoTracking()
            .Where(a => a.Account.UserId == currentUserId)
            .Select(a => new { a.AccountId, a.Amount, a.OccurredAt })
            .ToListAsync(ct);

        var eventsByAccount = accounts.ToDictionary(a => a.Id, _ => new List<BalanceEvent>());
        foreach (var txn in rawTransactions)
        {
            ct.ThrowIfCancellationRequested();

            var occurredUtc = txn.OccurredAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(txn.OccurredAt, DateTimeKind.Utc)
                : txn.OccurredAt.ToUniversalTime();

            var delta = txn.Type == TransactionType.Income ? txn.Money.Amount : -txn.Money.Amount;
            eventsByAccount[txn.AccountId].Add(new BalanceEvent(occurredUtc, delta, false));
        }

        foreach (var adjustment in rawAdjustments)
        {
            ct.ThrowIfCancellationRequested();

            var occurredUtc = adjustment.OccurredAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(adjustment.OccurredAt, DateTimeKind.Utc)
                : adjustment.OccurredAt.ToUniversalTime();

            eventsByAccount[adjustment.AccountId].Add(new BalanceEvent(occurredUtc, adjustment.Amount, true));
        }

        foreach (var list in eventsByAccount.Values)
            list.Sort((a, b) => a.OccurredAt.CompareTo(b.OccurredAt));

        var balancesByAccount = accounts.ToDictionary(a => a.Id, _ => 0m);
        var eventIndexByAccount = accounts.ToDictionary(a => a.Id, _ => 0);

        foreach (var account in accounts)
        {
            var events = eventsByAccount[account.Id];
            var idx = 0;
            var currentBalance = 0m;
            while (idx < events.Count && events[idx].OccurredAt < startMonthUtc)
            {
                currentBalance = ApplyBalanceEvent(currentBalance, events[idx]);
                idx++;
            }

            balancesByAccount[account.Id] = currentBalance;
            eventIndexByAccount[account.Id] = idx;
        }

        var result = new List<NetWorthSnapshotDto>(months);
        for (var i = 0; i < months; i++)
        {
            var boundary = startMonthUtc.AddMonths(i + 1);
            var rateAtUtc = boundary.AddTicks(-1);

            var rateByCurrency = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            foreach (var code in distinctAccountCurrencies)
            {
                if (string.Equals(code, userMeta.BaseCurrencyCode, StringComparison.OrdinalIgnoreCase))
                {
                    rateByCurrency[code] = 1m;
                    continue;
                }

                var converted = await currencyConverter.ConvertAsync(
                    new Money(code, 1m),
                    userMeta.BaseCurrencyCode,
                    rateAtUtc,
                    ct);
                rateByCurrency[code] = converted.Amount;
            }

            foreach (var account in accounts)
            {
                var events = eventsByAccount[account.Id];
                var idx = eventIndexByAccount[account.Id];
                var currentBalance = balancesByAccount[account.Id];

                while (idx < events.Count && events[idx].OccurredAt < boundary)
                {
                    currentBalance = ApplyBalanceEvent(currentBalance, events[idx]);
                    idx++;
                }

                balancesByAccount[account.Id] = currentBalance;
                eventIndexByAccount[account.Id] = idx;
            }

            var netWorth = 0m;
            foreach (var account in accounts)
            {
                var balance = balancesByAccount[account.Id];
                var rate = rateByCurrency.TryGetValue(account.CurrencyCode, out var foundRate) ? foundRate : 1m;
                netWorth += balance * rate;
            }

            var monthDate = startMonthUtc.AddMonths(i);
            result.Add(new NetWorthSnapshotDto(
                monthDate.Year,
                monthDate.Month,
                Round2(netWorth)));
        }

        return result;
    }

    private static decimal Round2(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private readonly record struct BalanceEvent(DateTime OccurredAt, decimal Amount, bool IsAdjustment);

    private static decimal ApplyBalanceEvent(decimal currentBalance, BalanceEvent balanceEvent)
        => balanceEvent.IsAdjustment ? balanceEvent.Amount : currentBalance + balanceEvent.Amount;

    private static List<NetWorthSnapshotDto> BuildEmptyNetWorth(int months)
    {
        if (months <= 0) return [];
        var nowUtc = DateTime.UtcNow;
        var startMonthUtc = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc)
            .AddMonths(-(months - 1));
        var result = new List<NetWorthSnapshotDto>(months);
        for (var i = 0; i < months; i++)
        {
            var monthDate = startMonthUtc.AddMonths(i);
            result.Add(new NetWorthSnapshotDto(monthDate.Year, monthDate.Month, 0m));
        }
        return result;
    }

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

    private async Task<(decimal LiquidAssets, decimal? LiquidMonths, string? LiquidStatus)> BuildLiquidMetricsAsync(
        string baseCurrencyCode,
        DateTime monthStartUtc,
        DateTime monthEndUtc,
        CancellationToken ct)
    {
        var accounts = await accountsService.GetAccounts(ct);
        var liquidAssets = accounts
            .Where(a => a.IsLiquid)
            .Sum(a => a.BalanceInBaseCurrency);

        var medianMonthlyExpense = await GetAverageMonthlyExpensesAsync(
            baseCurrencyCode,
            monthStartUtc,
            monthEndUtc,
            ct);

        decimal? liquidMonths = null;
        if (medianMonthlyExpense.HasValue && medianMonthlyExpense.Value > 0m)
        {
            liquidMonths = Math.Round(liquidAssets / medianMonthlyExpense.Value, 2, MidpointRounding.AwayFromZero);
        }

        var status = ResolveLiquidStatus(liquidMonths);
        return (liquidAssets, liquidMonths, status);
    }

    private async Task<decimal?> GetAverageMonthlyExpensesAsync(
        string baseCurrencyCode,
        DateTime monthStartUtc,
        DateTime monthEndUtc,
        CancellationToken ct)
    {
        var windowStartUtc = monthStartUtc.AddMonths(-5);
        var windowEndUtc = monthEndUtc;

        var rawExpenses = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserService.Id &&
                        !t.IsTransfer &&
                        t.Type == TransactionType.Expense &&
                        t.OccurredAt >= windowStartUtc &&
                        t.OccurredAt < windowEndUtc)
            .Select(t => new { t.Money, t.OccurredAt })
            .ToListAsync(ct);

        var dailyTotals = new Dictionary<DateOnly, decimal>();
        foreach (var expense in rawExpenses)
        {
            ct.ThrowIfCancellationRequested();

            var occurredUtc = expense.OccurredAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(expense.OccurredAt, DateTimeKind.Utc)
                : expense.OccurredAt.ToUniversalTime();

            var baseMoney = await currencyConverter.ConvertAsync(
                money: expense.Money,
                toCurrencyCode: baseCurrencyCode,
                atUtc: occurredUtc,
                ct: ct);

            var dayKey = DateOnly.FromDateTime(occurredUtc);
            if (dailyTotals.TryGetValue(dayKey, out var current))
                dailyTotals[dayKey] = current + baseMoney.Amount;
            else
                dailyTotals[dayKey] = baseMoney.Amount;
        }

        if (dailyTotals.Count == 0)
            return null;

        var expenseDayTotals = dailyTotals.Values.ToList();
        if (expenseDayTotals.Count <= 0)
            return null;

        return expenseDayTotals.Average() * 30;
    }

    private static string? ResolveLiquidStatus(decimal? liquidMonths)
    {
        if (!liquidMonths.HasValue) return null;
        if (liquidMonths.Value > 6m) return "good";
        if (liquidMonths.Value >= 3m) return "average";
        return "poor";
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
                        !t.IsTransfer &&
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
        var series = new ForecastSeriesDto(days, actual, forecast, baselineLimit);
        return new ForecastDto(summary, series);
    }

    private static void ValidateYearMonth(int year, int month)
    {
        if (year is < 2000 or > 2100)
            throw new DomainValidationException(
                "Некорректный год.",
                "invalid_year",
                new { year });

        if (month is < 1 or > 12)
            throw new DomainValidationException(
                "Некорректный месяц.",
                "invalid_month",
                new { month });
    }
}
