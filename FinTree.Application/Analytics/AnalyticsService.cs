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
    private static readonly TimeSpan OpeningBalanceDetectionWindow = TimeSpan.FromSeconds(5);
    private static readonly DateTime OpeningBalanceAnchorUtc = DateTime.UnixEpoch;
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
            .Select(t => new { t.CategoryId, t.Money, t.OccurredAt, t.Type, t.IsMandatory })
            .ToListAsync(ct);

        var normalizedTransactions = transactions.Select(txn => new
        {
            txn.CategoryId,
            txn.Money,
            txn.Type,
            OccurredUtc = NormalizeUtc(txn.OccurredAt),
            txn.IsMandatory
        }).ToList();

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            normalizedTransactions.Select(txn => (txn.Money.CurrencyCode, txn.OccurredUtc)),
            baseCurrencyCode,
            ct);

        var dailyTotals = new Dictionary<DateOnly, decimal>();
        var currentCategoryTotals = new Dictionary<Guid, decimal>();
        var previousCategoryTotals = new Dictionary<Guid, decimal>();

        var totalIncome = 0m;
        var totalExpenses = 0m;
        var previousMonthExpenses = 0m;
        var discretionaryTotal = 0m;

        foreach (var txn in normalizedTransactions)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (NormalizeCurrencyCode(txn.Money.CurrencyCode), txn.OccurredUtc.Date);
            var amount = txn.Money.Amount * rateByCurrencyAndDay[rateKey];
            var occurredUtc = txn.OccurredUtc;
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

                if (!txn.IsMandatory)
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

        var spending = await BuildSpendingBreakdownAsync(
            year,
            month,
            baseCurrencyCode,
            monthStartUtc,
            monthEndUtc,
            ct);

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
            .Select(a => new { a.Id, a.CurrencyCode, a.CreatedAt })
            .ToListAsync(ct);

        if (accounts.Count == 0)
        {
            return BuildEmptyNetWorth(months);
        }

        var accountCreatedAtById = accounts
            .ToDictionary(a => a.Id, a => NormalizeUtc(a.CreatedAt.UtcDateTime));

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

            var occurredUtc = NormalizeUtc(txn.OccurredAt);

            var delta = txn.Type == TransactionType.Income ? txn.Money.Amount : -txn.Money.Amount;
            eventsByAccount[txn.AccountId].Add(new BalanceEvent(occurredUtc, delta, false));
        }

        var adjustmentsByAccount = rawAdjustments
            .GroupBy(a => a.AccountId)
            .ToDictionary(
                g => g.Key,
                g =>
                {
                    var events = g
                        .Select(a => new BalanceEvent(NormalizeUtc(a.OccurredAt), a.Amount, true))
                        .OrderBy(a => a.OccurredAt)
                        .ToList();

                    if (events.Count == 1 &&
                        IsOpeningBalanceAnchor(accountCreatedAtById[g.Key], events[0].OccurredAt))
                    {
                        var opening = events[0];
                        events[0] = new BalanceEvent(OpeningBalanceAnchorUtc, opening.Amount, true);
                    }

                    return events;
                });

        foreach (var adjustmentGroup in adjustmentsByAccount)
        {
            ct.ThrowIfCancellationRequested();
            eventsByAccount[adjustmentGroup.Key].AddRange(adjustmentGroup.Value);
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

    private static DateTime NormalizeUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Unspecified)
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return value.ToUniversalTime();
    }

    private static string NormalizeCurrencyCode(string value)
        => string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToUpperInvariant();

    private static bool IsOpeningBalanceAnchor(DateTime accountCreatedAtUtc, DateTime adjustmentOccurredAtUtc)
        => (adjustmentOccurredAtUtc - accountCreatedAtUtc).Duration() <= OpeningBalanceDetectionWindow;

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

    private static decimal? ComputeQuantile(IReadOnlyList<decimal> values, double quantile)
    {
        if (values.Count == 0) return null;

        var sorted = values.OrderBy(v => v).ToList();
        if (quantile <= 0d) return sorted[0];
        if (quantile >= 1d) return sorted[^1];

        var position = (sorted.Count - 1) * quantile;
        var lowerIndex = (int)Math.Floor(position);
        var upperIndex = (int)Math.Ceiling(position);

        if (lowerIndex == upperIndex)
            return sorted[lowerIndex];

        var weight = (decimal)(position - lowerIndex);
        return sorted[lowerIndex] + ((sorted[upperIndex] - sorted[lowerIndex]) * weight);
    }

    private static decimal ComputePeakThreshold(IReadOnlyList<decimal> positiveDailyTotals, decimal medianDaily)
    {
        if (positiveDailyTotals.Count < 10)
            return medianDaily * 2m;

        var p90 = ComputeQuantile(positiveDailyTotals, 0.90d) ?? medianDaily * 2m;
        var absoluteDeviations = positiveDailyTotals
            .Select(value => Math.Abs(value - medianDaily))
            .ToList();
        var mad = ComputeMedian(absoluteDeviations) ?? 0m;
        var robustThreshold = medianDaily + (1.2m * mad);

        return Math.Max(p90, robustThreshold);
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

        var positiveDailyTotals = dailyTotals.Values
            .Where(value => value > 0m)
            .ToList();

        if (positiveDailyTotals.Count == 0)
        {
            return (new PeakDaysSummaryDto(0, 0m, null, monthTotal), new List<PeakDayDto>());
        }

        var threshold = ComputePeakThreshold(positiveDailyTotals, medianDaily.Value);
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
        var accounts = await accountsService.GetAccounts(ct: ct);
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

        var normalizedExpenses = rawExpenses.Select(expense => new
        {
            expense.Money,
            OccurredUtc = NormalizeUtc(expense.OccurredAt)
        }).ToList();

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            normalizedExpenses.Select(expense => (expense.Money.CurrencyCode, expense.OccurredUtc)),
            baseCurrencyCode,
            ct);

        var dailyTotals = new Dictionary<DateOnly, decimal>();
        foreach (var expense in normalizedExpenses)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (NormalizeCurrencyCode(expense.Money.CurrencyCode), expense.OccurredUtc.Date);
            var amountInBaseCurrency = expense.Money.Amount * rateByCurrencyAndDay[rateKey];

            var dayKey = DateOnly.FromDateTime(expense.OccurredUtc);
            if (dailyTotals.TryGetValue(dayKey, out var current))
                dailyTotals[dayKey] = current + amountInBaseCurrency;
            else
                dailyTotals[dayKey] = amountInBaseCurrency;
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

    private async Task<SpendingBreakdownDto> BuildSpendingBreakdownAsync(
        int year,
        int month,
        string baseCurrencyCode,
        DateTime monthStartUtc,
        DateTime monthEndUtc,
        CancellationToken ct)
    {
        var monthsWindowStartUtc = monthStartUtc.AddMonths(-11);

        var rawExpenses = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserService.Id &&
                        !t.IsTransfer &&
                        t.Type == TransactionType.Expense &&
                        t.OccurredAt >= monthsWindowStartUtc &&
                        t.OccurredAt < monthEndUtc)
            .Select(t => new { t.Money, t.OccurredAt })
            .ToListAsync(ct);

        var normalizedExpenses = rawExpenses.Select(expense => new
        {
            expense.Money,
            OccurredUtc = NormalizeUtc(expense.OccurredAt)
        }).ToList();

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            normalizedExpenses.Select(expense => (expense.Money.CurrencyCode, expense.OccurredUtc)),
            baseCurrencyCode,
            ct);

        var dailyTotals = new Dictionary<DateOnly, decimal>();
        foreach (var expense in normalizedExpenses)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (NormalizeCurrencyCode(expense.Money.CurrencyCode), expense.OccurredUtc.Date);
            var amountInBaseCurrency = expense.Money.Amount * rateByCurrencyAndDay[rateKey];

            var dayKey = DateOnly.FromDateTime(expense.OccurredUtc);
            if (dailyTotals.TryGetValue(dayKey, out var current))
                dailyTotals[dayKey] = current + amountInBaseCurrency;
            else
                dailyTotals[dayKey] = amountInBaseCurrency;
        }

        var daysInMonth = DateTime.DaysInMonth(year, month);

        var days = new List<MonthlyExpensesDto>(daysInMonth);
        for (var day = 1; day <= daysInMonth; day++)
        {
            var date = new DateOnly(year, month, day);
            var amount = dailyTotals.TryGetValue(date, out var value) ? value : 0m;
            days.Add(new MonthlyExpensesDto(year, month, day, null, Round2(amount)));
        }

        var weeksWindowStart = DateOnly.FromDateTime(monthStartUtc.AddMonths(-2));
        var weeksWindowEndExclusive = DateOnly.FromDateTime(monthEndUtc);
        var weekTotals = new Dictionary<(int IsoYear, int IsoWeek), decimal>();

        var dayCursor = weeksWindowStart;
        while (dayCursor.DayNumber < weeksWindowEndExclusive.DayNumber)
        {
            var dayAmount = dailyTotals.TryGetValue(dayCursor, out var value) ? value : 0m;
            var dayDateTime = dayCursor.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var isoYear = System.Globalization.ISOWeek.GetYear(dayDateTime);
            var isoWeek = System.Globalization.ISOWeek.GetWeekOfYear(dayDateTime);
            var key = (isoYear, isoWeek);

            if (weekTotals.TryGetValue(key, out var currentTotal))
                weekTotals[key] = currentTotal + dayAmount;
            else
                weekTotals[key] = dayAmount;

            dayCursor = dayCursor.AddDays(1);
        }

        var weeksResult = weekTotals
            .Select(kv =>
            {
                var weekStart = System.Globalization.ISOWeek.ToDateTime(kv.Key.IsoYear, kv.Key.IsoWeek, DayOfWeek.Monday);
                return new MonthlyExpensesDto(
                    kv.Key.IsoYear,
                    weekStart.Month,
                    null,
                    kv.Key.IsoWeek,
                    Round2(kv.Value));
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Week)
            .ToList();

        var monthTotals = new Dictionary<(int Year, int Month), decimal>();
        foreach (var dayTotal in dailyTotals)
        {
            var monthKey = (dayTotal.Key.Year, dayTotal.Key.Month);
            if (monthTotals.TryGetValue(monthKey, out var currentTotal))
                monthTotals[monthKey] = currentTotal + dayTotal.Value;
            else
                monthTotals[monthKey] = dayTotal.Value;
        }

        var months = new List<MonthlyExpensesDto>(12);
        for (var offset = -11; offset <= 0; offset++)
        {
            var monthDate = monthStartUtc.AddMonths(offset);
            var monthKey = (monthDate.Year, monthDate.Month);
            var monthTotal = monthTotals.TryGetValue(monthKey, out var value) ? value : 0m;
            months.Add(new MonthlyExpensesDto(monthDate.Year, monthDate.Month, null, null, Round2(monthTotal)));
        }

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

        var normalizedForecastTransactions = forecastTransactions.Select(txn => new
        {
            txn.Money,
            OccurredUtc = NormalizeUtc(txn.OccurredAt)
        }).ToList();

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            normalizedForecastTransactions.Select(txn => (txn.Money.CurrencyCode, txn.OccurredUtc)),
            baseCurrencyCode,
            ct);

        var forecastDailyTotals = new Dictionary<DateOnly, decimal>();
        foreach (var txn in normalizedForecastTransactions)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (NormalizeCurrencyCode(txn.Money.CurrencyCode), txn.OccurredUtc.Date);
            var amountInBaseCurrency = txn.Money.Amount * rateByCurrencyAndDay[rateKey];

            var dateKey = DateOnly.FromDateTime(txn.OccurredUtc);
            if (forecastDailyTotals.TryGetValue(dateKey, out var current))
                forecastDailyTotals[dateKey] = current + amountInBaseCurrency;
            else
                forecastDailyTotals[dateKey] = amountInBaseCurrency;
        }

        var historicalDailyTotals = forecastDailyTotals.Values
            .Where(v => v > 0m)
            .ToList();

        var optimisticDaily = ComputeQuantile(historicalDailyTotals, 0.40d);
        var baselineDaily = ComputeQuantile(historicalDailyTotals, 0.50d);
        var riskDaily = ComputeQuantile(historicalDailyTotals, 0.75d);
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var observedDays = isCurrentMonth
            ? Math.Min(nowUtc.Day, daysInMonth)
            : daysInMonth;

        var days = new List<int>(daysInMonth);
        var actual = new List<decimal?>(daysInMonth);
        var optimistic = new List<decimal?>(daysInMonth);
        var forecast = new List<decimal?>(daysInMonth);
        var risk = new List<decimal?>(daysInMonth);

        decimal cumulative = 0m;
        decimal observedCumulative = 0m;
        for (var day = 1; day <= daysInMonth; day++)
        {
            days.Add(day);
            var dateKey = new DateOnly(year, month, day);
            var dayAmount = dailyTotals.TryGetValue(dateKey, out var value) ? value : 0m;
            cumulative += dayAmount;
            if (day <= observedDays)
                observedCumulative = cumulative;

            if (isCurrentMonth && day > observedDays)
                actual.Add(null);
            else
                actual.Add(Round2(cumulative));

            optimistic.Add(BuildForecastScenarioPoint(
                optimisticDaily,
                isCurrentMonth,
                day,
                observedDays,
                cumulative,
                observedCumulative));
            forecast.Add(BuildForecastScenarioPoint(
                baselineDaily,
                isCurrentMonth,
                day,
                observedDays,
                cumulative,
                observedCumulative));
            risk.Add(BuildForecastScenarioPoint(
                riskDaily,
                isCurrentMonth,
                day,
                observedDays,
                cumulative,
                observedCumulative));
        }

        var currentSpent = isCurrentMonth
            ? Round2(observedCumulative)
            : Round2(cumulative);
        var optimisticTotal = BuildForecastScenarioTotal(
            optimisticDaily,
            isCurrentMonth,
            daysInMonth,
            observedDays,
            observedCumulative);
        var forecastTotal = BuildForecastScenarioTotal(
            baselineDaily,
            isCurrentMonth,
            daysInMonth,
            observedDays,
            observedCumulative);
        var riskTotal = BuildForecastScenarioTotal(
            riskDaily,
            isCurrentMonth,
            daysInMonth,
            observedDays,
            observedCumulative);
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

        var summary = new ForecastSummaryDto(
            forecastTotal,
            optimisticTotal,
            riskTotal,
            currentSpent,
            baselineLimit,
            status);
        var series = new ForecastSeriesDto(days, actual, optimistic, forecast, risk, baselineLimit);
        return new ForecastDto(summary, series);
    }

    private static decimal? BuildForecastScenarioPoint(
        decimal? projectedDaily,
        bool isCurrentMonth,
        int day,
        int observedDays,
        decimal cumulativeActual,
        decimal observedCumulativeActual)
    {
        if (!projectedDaily.HasValue)
            return null;

        if (isCurrentMonth)
        {
            if (day <= observedDays)
                return Round2(cumulativeActual);

            return Round2(observedCumulativeActual + projectedDaily.Value * (day - observedDays));
        }

        return Round2(projectedDaily.Value * day);
    }

    private static decimal? BuildForecastScenarioTotal(
        decimal? projectedDaily,
        bool isCurrentMonth,
        int daysInMonth,
        int observedDays,
        decimal observedCumulativeActual)
    {
        if (!projectedDaily.HasValue)
            return null;

        if (isCurrentMonth)
        {
            var remainingDays = Math.Max(daysInMonth - observedDays, 0);
            return Round2(observedCumulativeActual + projectedDaily.Value * remainingDays);
        }

        return Round2(projectedDaily.Value * daysInMonth);
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
