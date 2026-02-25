using FinTree.Application.Abstractions;
using FinTree.Application.Exceptions;
using FinTree.Application.Currencies;
using FinTree.Application.Users;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Analytics;

public sealed class AnalyticsService(
    IAppDbContext context,
    ICurrentUser currentUserService,
    CurrencyConverter currencyConverter,
    UserService userService)
{
    private static readonly TimeSpan OpeningBalanceDetectionWindow = TimeSpan.FromSeconds(5);
    private readonly record struct CategoryMeta(string Name, string Color, bool IsMandatory);
    private readonly record struct CategoryTotals(decimal Total, decimal MandatoryTotal, decimal DiscretionaryTotal);

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
        var deltaWindowStartUtc = monthStartUtc.AddMonths(-1);
        var nowUtc = DateTime.UtcNow;

        var categories = (await userService.GetUserCategoriesAsync(ct))
            .ToDictionary(c => c.Id, c => new CategoryMeta(c.Name, c.Color, c.IsMandatory));

        const int requiredExpenseDays = 7;
        var observedExpenseDays = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserId &&
                        !t.IsTransfer &&
                        t.Type == TransactionType.Expense)
            .Select(t => t.OccurredAt.Date)
            .Distinct()
            .CountAsync(ct);
        var readiness = new AnalyticsReadinessDto(
            observedExpenseDays >= requiredExpenseDays,
            observedExpenseDays,
            requiredExpenseDays);

        var transactions = await context.Transactions
            .Where(t => t.Account.UserId == currentUserId &&
                        !t.IsTransfer &&
                        t.OccurredAt >= deltaWindowStartUtc &&
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
        var dailyTotalsDiscretionary = new Dictionary<DateOnly, decimal>();
        var currentCategoryTotals = new Dictionary<Guid, CategoryTotals>();
        var priorCategoryTotals = new Dictionary<Guid, decimal>();
        var priorMonthsWithData = new HashSet<(int Year, int Month)>();

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

                if (!txn.IsMandatory)
                {
                    if (dailyTotalsDiscretionary.TryGetValue(dateKey, out var currentDisc))
                        dailyTotalsDiscretionary[dateKey] = currentDisc + amount;
                    else
                        dailyTotalsDiscretionary[dateKey] = amount;
                }

                if (currentCategoryTotals.TryGetValue(txn.CategoryId, out var categoryTotals))
                {
                    categoryTotals = categoryTotals with
                    {
                        Total = categoryTotals.Total + amount,
                        MandatoryTotal = categoryTotals.MandatoryTotal + (txn.IsMandatory ? amount : 0m),
                        DiscretionaryTotal = categoryTotals.DiscretionaryTotal + (txn.IsMandatory ? 0m : amount)
                    };
                    currentCategoryTotals[txn.CategoryId] = categoryTotals;
                }
                else
                {
                    currentCategoryTotals[txn.CategoryId] = new CategoryTotals(
                        amount,
                        txn.IsMandatory ? amount : 0m,
                        txn.IsMandatory ? 0m : amount);
                }

                if (!txn.IsMandatory)
                    discretionaryTotal += amount;
            }

            var isPriorWindow = occurredUtc >= deltaWindowStartUtc && occurredUtc < monthStartUtc;

            if (isPriorWindow)
            {
                if (priorCategoryTotals.TryGetValue(txn.CategoryId, out var priorTotal))
                    priorCategoryTotals[txn.CategoryId] = priorTotal + amount;
                else
                    priorCategoryTotals[txn.CategoryId] = amount;
                priorMonthsWithData.Add((occurredUtc.Year, occurredUtc.Month));
            }

            if (isPreviousMonth)
            {
                previousMonthExpenses += amount;
            }
        }

        var daysInMonth = DateTime.DaysInMonth(year, month);
        var isSelectedCurrentMonth = monthStartUtc.Year == nowUtc.Year && monthStartUtc.Month == nowUtc.Month;
        var observedDaysInMonth = isSelectedCurrentMonth
            ? Math.Min(nowUtc.Day, daysInMonth)
            : daysInMonth;

        var observedDailyValues = new List<decimal>(observedDaysInMonth);
        for (var day = 1; day <= observedDaysInMonth; day++)
        {
            var dateKey = new DateOnly(year, month, day);
            var dayAmount = dailyTotals.TryGetValue(dateKey, out var value) ? value : 0m;
            observedDailyValues.Add(dayAmount);
        }

        var positiveObservedDailyValues = observedDailyValues
            .Where(v => v > 0m)
            .ToList();
        
        var meanDaily = observedDailyValues.Count > 0 ? observedDailyValues.Average() : (decimal?)null;
        var medianDaily = positiveObservedDailyValues.Count > 0 ? ComputeMedian(positiveObservedDailyValues) : null;
        var discretionaryDayValues = dailyTotalsDiscretionary.Values.Where(v => v > 0m).ToList();
        var peakMedianDaily = discretionaryDayValues.Count > 0 ? ComputeMedian(discretionaryDayValues) : null;
        decimal? stabilityIndex = null;
        if (observedDailyValues.Count >= 4 && medianDaily is > 0m)
        {
            var q1 = ComputeQuantile(positiveObservedDailyValues, 0.25d);
            var q3 = ComputeQuantile(positiveObservedDailyValues, 0.75d);
            if (q1.HasValue && q3.HasValue)
                stabilityIndex = (q3.Value - q1.Value) / medianDaily.Value;
        }

        var netCashflow = totalIncome - totalExpenses;
        var savingsRate = totalIncome > 0m ? netCashflow / totalIncome : (decimal?)null;
        var discretionaryShare = totalExpenses > 0m ? (discretionaryTotal / totalExpenses) * 100 : (decimal?)null;
        var monthOverMonth = previousMonthExpenses > 0m
            ? (totalExpenses - previousMonthExpenses) / previousMonthExpenses * 100
            : (decimal?)null;

        var peaks = BuildPeakDays(dailyTotalsDiscretionary, peakMedianDaily, totalExpenses);

        var categoryItems = currentCategoryTotals.Select(kv =>
        {
            if (!categories.TryGetValue(kv.Key, out var info))
                info = new CategoryMeta("Без категории", "#9e9e9e", false);
            var percent = totalExpenses > 0m ? (kv.Value.Total / totalExpenses) * 100 : (decimal?)null;
            return new CategoryBreakdownItemDto(
                kv.Key,
                info.Name,
                info.Color,
                Round2(kv.Value.Total),
                Round2(kv.Value.MandatoryTotal),
                Round2(kv.Value.DiscretionaryTotal),
                percent,
                info.IsMandatory);
        }).OrderByDescending(x => x.Amount).ToList();

        var priorMonthCount = Math.Max(priorMonthsWithData.Count, 1);
        var averagedPriorTotals = priorCategoryTotals
            .ToDictionary(kv => kv.Key, kv => kv.Value / priorMonthCount);

        var categoryDelta = BuildCategoryDelta(
            currentCategoryTotals.ToDictionary(kv => kv.Key, kv => kv.Value.Total),
            averagedPriorTotals,
            categories);

        var spending = await BuildSpendingBreakdownAsync(
            year,
            month,
            baseCurrencyCode,
            monthStartUtc,
            monthEndUtc,
            ct);

        var forecast = await BuildForecastAsync(year, month, dailyTotals, baseCurrencyCode, ct);

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
            StabilityIndex: stabilityIndex.HasValue ? Round2(stabilityIndex.Value) : null,
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
            forecast,
            readiness);
    }

    public async Task<List<NetWorthSnapshotDto>> GetNetWorthTrendAsync(int months = 12, CancellationToken ct = default)
    {
        switch (months)
        {
            case <= 0:
                return [];
            case > 12:
                months = 12;
                break;
        }

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
            return [];

        var accountCreatedAtById = accounts
            .ToDictionary(a => a.Id, a => NormalizeUtc(a.CreatedAt.UtcDateTime));

        var nowUtc = DateTime.UtcNow;
        var currentMonthStartUtc = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var requestedStartMonthUtc = currentMonthStartUtc
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

        var earliestDataUtc = accountCreatedAtById.Values.Min();
        if (rawTransactions.Count > 0)
        {
            var firstTransactionUtc = rawTransactions.Min(t => NormalizeUtc(t.OccurredAt));
            if (firstTransactionUtc < earliestDataUtc)
                earliestDataUtc = firstTransactionUtc;
        }

        if (rawAdjustments.Count > 0)
        {
            var firstAdjustmentUtc = rawAdjustments.Min(a => NormalizeUtc(a.OccurredAt));
            if (firstAdjustmentUtc < earliestDataUtc)
                earliestDataUtc = firstAdjustmentUtc;
        }

        var earliestDataMonthUtc = new DateTime(
            earliestDataUtc.Year,
            earliestDataUtc.Month,
            1,
            0,
            0,
            0,
            DateTimeKind.Utc);
        var effectiveStartMonthUtc = earliestDataMonthUtc > requestedStartMonthUtc
            ? earliestDataMonthUtc
            : requestedStartMonthUtc;

        if (effectiveStartMonthUtc > currentMonthStartUtc)
            return [];

        var monthsToBuild = ((currentMonthStartUtc.Year - effectiveStartMonthUtc.Year) * 12) +
                            (currentMonthStartUtc.Month - effectiveStartMonthUtc.Month) + 1;

        var accountIds = accounts
            .Select(a => a.Id)
            .ToArray();

        var eventsByAccount = BuildBalanceEventsByAccount(
            accountIds,
            accountCreatedAtById,
            rawTransactions.Select(t => (
                t.AccountId,
                NormalizeUtc(t.OccurredAt),
                t.Type == TransactionType.Income ? t.Money.Amount : -t.Money.Amount)),
            rawAdjustments.Select(a => (a.AccountId, NormalizeUtc(a.OccurredAt), a.Amount)),
            ct);

        var balancesByAccount = accountIds.ToDictionary(id => id, _ => 0m);
        var eventIndexByAccount = accountIds.ToDictionary(id => id, _ => 0);

        AdvanceBalancesToBoundary(
            effectiveStartMonthUtc,
            accountIds,
            eventsByAccount,
            balancesByAccount,
            eventIndexByAccount,
            ct);

        var result = new List<NetWorthSnapshotDto>(monthsToBuild);
        for (var i = 0; i < monthsToBuild; i++)
        {
            var boundary = effectiveStartMonthUtc.AddMonths(i + 1);
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

            AdvanceBalancesToBoundary(
                boundary,
                accountIds,
                eventsByAccount,
                balancesByAccount,
                eventIndexByAccount,
                ct);

            var netWorth = 0m;
            foreach (var account in accounts)
            {
                var balance = balancesByAccount[account.Id];
                var rate = rateByCurrency.TryGetValue(account.CurrencyCode, out var foundRate) ? foundRate : 1m;
                netWorth += balance * rate;
            }

            var monthDate = effectiveStartMonthUtc.AddMonths(i);
            result.Add(new NetWorthSnapshotDto(
                monthDate.Year,
                monthDate.Month,
                Round2(netWorth)));
        }

        return result;
    }

    private static decimal Round2(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private readonly record struct AccountSnapshot(Guid Id, string CurrencyCode, bool IsLiquid, DateTime CreatedAtUtc);
    private readonly record struct AdjustmentSnapshot(Guid AccountId, decimal Amount, DateTime OccurredAtUtc);
    private readonly record struct TransactionSnapshot(
        Guid AccountId,
        Money Money,
        DateTime OccurredAtUtc,
        TransactionType Type,
        bool IsTransfer,
        bool IsMandatory);
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
        var liquidAssets = await GetLiquidAssetsAtAsync(baseCurrencyCode, monthEndUtc, ct);
        var dailyRate = await GetAverageDailyExpenseAsync(baseCurrencyCode, monthEndUtc, ct);
        var monthlyExpense180d = dailyRate * 30.44m;

        var liquidMonths = monthlyExpense180d > 0m
            ? Math.Round(liquidAssets / monthlyExpense180d, 2, MidpointRounding.AwayFromZero)
            : 0m;

        var status = ResolveLiquidStatus(liquidMonths);
        return (liquidAssets, liquidMonths, status);
    }

    private async Task<decimal> GetAverageDailyExpenseAsync(
        string baseCurrencyCode,
        DateTime windowEnd,
        CancellationToken ct)
    {
        var windowStartUtc = windowEnd.AddDays(-180);

        var earliestTrackedAtRaw = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserService.Id &&
                        !t.IsTransfer &&
                        t.OccurredAt < windowEnd)
            .Select(t => (DateTime?)t.OccurredAt)
            .MinAsync(ct);

        // No transactions exist at all — the expense query below will also be empty.
        if (!earliestTrackedAtRaw.HasValue)
            return 0m;

        var rawExpenses = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserService.Id &&
                        !t.IsTransfer &&
                        t.Type == TransactionType.Expense &&
                        t.OccurredAt >= windowStartUtc &&
                        t.OccurredAt < windowEnd)
            .Select(t => new { t.Money, t.OccurredAt })
            .ToListAsync(ct);

        var normalizedExpenses = rawExpenses.Select(e => new
        {
            e.Money,
            OccurredUtc = NormalizeUtc(e.OccurredAt)
        }).ToList();

        if (normalizedExpenses.Count == 0)
            return 0m;

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            normalizedExpenses.Select(e => (e.Money.CurrencyCode, e.OccurredUtc)),
            baseCurrencyCode,
            ct);

        var totalExpense = 0m;
        foreach (var expense in normalizedExpenses)
        {
            ct.ThrowIfCancellationRequested();
            var rateKey = (NormalizeCurrencyCode(expense.Money.CurrencyCode), expense.OccurredUtc.Date);
            totalExpense += expense.Money.Amount * rateByCurrencyAndDay[rateKey];
        }

        var earliestTrackedAtUtc = NormalizeUtc(earliestTrackedAtRaw.Value);
        var effectiveStartUtc = earliestTrackedAtUtc > windowStartUtc ? earliestTrackedAtUtc : windowStartUtc;
        var calendarDays = (decimal)(windowEnd - effectiveStartUtc).TotalDays;

        if (calendarDays <= 0m)
            return 0m;

        return totalExpense / calendarDays;
    }

    private async Task<decimal> GetLiquidAssetsAtAsync(string baseCurrencyCode, DateTime atUtc, CancellationToken ct)
    {
        var currentUserId = currentUserService.Id;
        var liquidAccounts = await context.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == currentUserId && !a.IsArchived && a.IsLiquid)
            .Select(a => new { a.Id, a.CurrencyCode })
            .ToListAsync(ct);

        if (liquidAccounts.Count == 0)
            return 0m;

        var accountIds = liquidAccounts.Select(a => a.Id).ToList();
        var rawAdjustments = await context.AccountBalanceAdjustments
            .AsNoTracking()
            .Where(a => accountIds.Contains(a.AccountId) && a.OccurredAt < atUtc)
            .Select(a => new { a.AccountId, a.Amount, a.OccurredAt })
            .ToListAsync(ct);

        var rawTransactions = await context.Transactions
            .AsNoTracking()
            .Where(t => accountIds.Contains(t.AccountId) && t.OccurredAt < atUtc)
            .Select(t => new { t.AccountId, t.Money, t.OccurredAt, t.Type })
            .ToListAsync(ct);

        var adjustmentsByAccount = rawAdjustments
            .GroupBy(a => a.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(a => new
                    {
                        a.Amount,
                        OccurredUtc = NormalizeUtc(a.OccurredAt)
                    })
                    .OrderBy(a => a.OccurredUtc)
                    .ToList());

        var transactionsByAccount = rawTransactions
            .GroupBy(t => t.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(t => new
                    {
                        Delta = t.Type == TransactionType.Income ? t.Money.Amount : -t.Money.Amount,
                        OccurredUtc = NormalizeUtc(t.OccurredAt)
                    })
                    .OrderBy(t => t.OccurredUtc)
                    .ToList());

        var rateAtUtc = atUtc.AddTicks(-1);
        var rateByCurrency = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        foreach (var currency in liquidAccounts.Select(a => a.CurrencyCode).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (string.Equals(currency, baseCurrencyCode, StringComparison.OrdinalIgnoreCase))
            {
                rateByCurrency[currency] = 1m;
                continue;
            }

            var converted = await currencyConverter.ConvertAsync(
                new Money(currency, 1m),
                baseCurrencyCode,
                rateAtUtc,
                ct);
            rateByCurrency[currency] = converted.Amount;
        }

        var total = 0m;
        foreach (var account in liquidAccounts)
        {
            var balance = 0m;
            DateTime? anchorAt = null;

            if (adjustmentsByAccount.TryGetValue(account.Id, out var accountAdjustments) && accountAdjustments.Count > 0)
            {
                var latestAdjustment = accountAdjustments[^1];
                balance = latestAdjustment.Amount;
                anchorAt = latestAdjustment.OccurredUtc;
            }

            if (transactionsByAccount.TryGetValue(account.Id, out var accountTransactions) && accountTransactions.Count > 0)
            {
                var delta = accountTransactions
                    .Where(t => !anchorAt.HasValue || t.OccurredUtc > anchorAt.Value)
                    .Sum(t => t.Delta);
                balance += delta;
            }

            var rate = rateByCurrency.TryGetValue(account.CurrencyCode, out var foundRate) ? foundRate : 1m;
            total += balance * rate;
        }

        return Round2(total);
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
            if (previous <= 0m) continue;

            var delta = current - previous;
            var deltaPercent = (delta / previous) * 100m;
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
            .Take(3)
            .ToList();
        
        var decreased = entries
            .Where(x => x.DeltaAmount < 0)
            .OrderBy(x => x.DeltaAmount)
            .Take(3)
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

        var firstExpenseDate = dailyTotals.Count > 0 ? dailyTotals.Keys.Min() : (DateOnly?)null;
        var monthStartDate = new DateOnly(year, month, 1);
        var monthEndDate = new DateOnly(year, month, DateTime.DaysInMonth(year, month));

        var days = new List<MonthlyExpensesDto>(monthEndDate.Day);
        if (firstExpenseDate.HasValue)
        {
            var dayRangeStart = firstExpenseDate.Value > monthStartDate
                ? firstExpenseDate.Value
                : monthStartDate;

            for (var dateCursor = dayRangeStart;
                 dateCursor.DayNumber <= monthEndDate.DayNumber;
                 dateCursor = dateCursor.AddDays(1))
            {
                var amount = dailyTotals.TryGetValue(dateCursor, out var value) ? value : 0m;
                days.Add(new MonthlyExpensesDto(
                    dateCursor.Year,
                    dateCursor.Month,
                    dateCursor.Day,
                    null,
                    Round2(amount)));
            }
        }

        var weeksWindowStartCandidate = DateOnly.FromDateTime(monthStartUtc.AddMonths(-2));
        var weeksWindowEndExclusive = DateOnly.FromDateTime(monthEndUtc);
        var weekTotals = new Dictionary<(int IsoYear, int IsoWeek), decimal>();

        var weeksWindowStart = firstExpenseDate.HasValue && firstExpenseDate.Value > weeksWindowStartCandidate
            ? firstExpenseDate.Value
            : weeksWindowStartCandidate;

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

        var monthsWindowStartDate = DateOnly.FromDateTime(monthStartUtc.AddMonths(-11));
        var months = new List<MonthlyExpensesDto>(12);
        if (firstExpenseDate.HasValue)
        {
            var firstExpenseMonthStart = new DateOnly(firstExpenseDate.Value.Year, firstExpenseDate.Value.Month, 1);
            var monthCursor = firstExpenseMonthStart > monthsWindowStartDate
                ? firstExpenseMonthStart
                : monthsWindowStartDate;

            while (monthCursor.DayNumber <= monthStartDate.DayNumber)
            {
                var monthKey = (monthCursor.Year, monthCursor.Month);
                var monthTotal = monthTotals.TryGetValue(monthKey, out var value) ? value : 0m;
                months.Add(new MonthlyExpensesDto(
                    monthCursor.Year,
                    monthCursor.Month,
                    null,
                    null,
                    Round2(monthTotal)));
                monthCursor = monthCursor.AddMonths(1);
            }
        }

        return new SpendingBreakdownDto(days, weeksResult, months);
    }

    private async Task<ForecastDto> BuildForecastAsync(
        int year,
        int month,
        Dictionary<DateOnly, decimal> dailyTotals,
        string baseCurrencyCode,
        CancellationToken ct)
    {
        var nowUtc = DateTime.UtcNow;
        var monthStartUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEndUtc = monthStartUtc.AddMonths(1);
        var isCurrentMonth = monthStartUtc.Year == nowUtc.Year && monthStartUtc.Month == nowUtc.Month;
        var lastDate = isCurrentMonth ? nowUtc.Date : monthEndUtc.AddDays(-1).Date;

        var forecastEnd = new DateTime(lastDate.Year, lastDate.Month, lastDate.Day, 0, 0, 0, DateTimeKind.Utc);
        var forecastStart = forecastEnd.AddDays(-179);

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
        var baselineDailyRate = await GetAverageDailyExpenseAsync(baseCurrencyCode, forecastEnd.AddDays(1), ct);
        var baselineLimit = baselineDailyRate > 0m
            ? Round2(baselineDailyRate * daysInMonth)
            : (decimal?)null;

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

    public async Task<List<EvolutionMonthDto>> GetEvolutionAsync(int months, CancellationToken ct = default)
    {
        var currentUserId = currentUserService.Id;
        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);
        var baseCurrencyCodeNormalized = NormalizeCurrencyCode(baseCurrencyCode);

        var now = DateTime.UtcNow;
        var windowMonths = months > 0 ? months : 120;
        var windowStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
            .AddMonths(-(windowMonths - 1));

        var rawAccounts = await context.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == currentUserId && !a.IsArchived)
            .Select(a => new { a.Id, a.CurrencyCode, a.IsLiquid, a.CreatedAt })
            .ToListAsync(ct);
        var accountSnapshots = rawAccounts
            .Select(a => new AccountSnapshot(a.Id, a.CurrencyCode, a.IsLiquid, NormalizeUtc(a.CreatedAt.UtcDateTime)))
            .ToList();
        var accountIds = accountSnapshots
            .Select(a => a.Id)
            .ToArray();
        var accountCreatedAtById = accountSnapshots
            .ToDictionary(a => a.Id, a => a.CreatedAtUtc);
        var liquidAccounts = accountSnapshots
            .Where(a => a.IsLiquid)
            .ToList();

        var allAdjustments = await context.AccountBalanceAdjustments
            .AsNoTracking()
            .Where(a => a.Account.UserId == currentUserId)
            .Select(a => new { a.AccountId, a.Amount, a.OccurredAt })
            .ToListAsync(ct);
        var adjustmentSnapshots = allAdjustments
            .Select(a => new AdjustmentSnapshot(a.AccountId, a.Amount, NormalizeUtc(a.OccurredAt)))
            .ToList();

        var allTransactions = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserId && !t.Account.IsArchived)
            .Select(t => new
            {
                t.AccountId,
                t.Money,
                t.OccurredAt,
                t.Type,
                t.IsTransfer,
                t.IsMandatory
            })
            .ToListAsync(ct);
        var transactionSnapshots = allTransactions
            .Select(t => new TransactionSnapshot(
                t.AccountId,
                t.Money,
                NormalizeUtc(t.OccurredAt),
                t.Type,
                t.IsTransfer,
                t.IsMandatory))
            .ToList();

        var windowTransactions = transactionSnapshots
            .Where(t => !t.IsTransfer && t.OccurredAtUtc >= windowStart)
            .ToList();

        var monthStartsWithData = windowTransactions
            .Select(t => new DateTime(t.OccurredAtUtc.Year, t.OccurredAtUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc))
            .ToHashSet();

        var distinctAccountCurrencies = accountSnapshots
            .Select(a => NormalizeCurrencyCode(a.CurrencyCode))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var fxRateRequests = new HashSet<(string CurrencyCode, DateTime DayStartUtc)>();
        foreach (var txn in windowTransactions)
            fxRateRequests.Add((NormalizeCurrencyCode(txn.Money.CurrencyCode), txn.OccurredAtUtc.Date));

        foreach (var monthStart in monthStartsWithData)
        {
            var boundary = monthStart.AddMonths(1);
            var rateAtUtc = boundary.AddTicks(-1);
            var dayStartUtc = rateAtUtc.Date;
            foreach (var currencyCode in distinctAccountCurrencies)
                fxRateRequests.Add((currencyCode, dayStartUtc));
        }

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            fxRateRequests.Select(request => (request.CurrencyCode, request.DayStartUtc)),
            baseCurrencyCode,
            ct);

        var eventsByAccount = BuildBalanceEventsByAccount(
            accountIds,
            accountCreatedAtById,
            transactionSnapshots.Select(t => (
                t.AccountId,
                t.OccurredAtUtc,
                t.Type == TransactionType.Income ? t.Money.Amount : -t.Money.Amount)),
            adjustmentSnapshots.Select(a => (a.AccountId, a.OccurredAtUtc, a.Amount)),
            ct);

        var balancesByAccount = accountIds.ToDictionary(id => id, _ => 0m);
        var eventIndexByAccount = accountIds.ToDictionary(id => id, _ => 0);

        AdvanceBalancesToBoundary(
            windowStart,
            accountIds,
            eventsByAccount,
            balancesByAccount,
            eventIndexByAccount,
            ct);

        decimal ConvertAmount(string currencyCode, decimal amount, DateTime occurredAtUtc)
        {
            var normalizedCurrencyCode = NormalizeCurrencyCode(currencyCode);
            if (string.Equals(normalizedCurrencyCode, baseCurrencyCodeNormalized, StringComparison.OrdinalIgnoreCase))
                return amount;

            var rateKey = (normalizedCurrencyCode, occurredAtUtc.Date);
            return rateByCurrencyAndDay.TryGetValue(rateKey, out var rate)
                ? amount * rate
                : amount;
        }

        decimal ConvertAmountWithRate(string currencyCode, decimal amount, DateTime occurredAtUtc)
        {
            var normalizedCurrencyCode = NormalizeCurrencyCode(currencyCode);
            if (string.Equals(normalizedCurrencyCode, baseCurrencyCodeNormalized, StringComparison.OrdinalIgnoreCase))
                return amount;

            var rate = rateByCurrencyAndDay[(normalizedCurrencyCode, occurredAtUtc.Date)];
            return amount * rate;
        }

        var result = new List<EvolutionMonthDto>(windowMonths);

        for (var i = 0; i < windowMonths; i++)
        {
            var monthStart = windowStart.AddMonths(i);
            var monthEnd = monthStart.AddMonths(1);
            if (monthStart > now)
                break;

            AdvanceBalancesToBoundary(
                monthEnd,
                accountIds,
                eventsByAccount,
                balancesByAccount,
                eventIndexByAccount,
                ct);

            var monthExpenses = windowTransactions
                .Where(t => t.Type == TransactionType.Expense &&
                            t.OccurredAtUtc >= monthStart && t.OccurredAtUtc < monthEnd)
                .ToList();

            var monthIncomeTransactions = windowTransactions
                .Where(t => t.Type == TransactionType.Income &&
                            t.OccurredAtUtc >= monthStart && t.OccurredAtUtc < monthEnd)
                .ToList();

            if (monthExpenses.Count == 0 && monthIncomeTransactions.Count == 0)
            {
                result.Add(new EvolutionMonthDto(monthStart.Year, monthStart.Month, false,
                    null, null, null, null, null, null, null));
                continue;
            }

            var monthIncome = monthIncomeTransactions.Sum(t =>
                ConvertAmount(t.Money.CurrencyCode, t.Money.Amount, t.OccurredAtUtc));

            var dailyTotals = monthExpenses
                .GroupBy(t => t.OccurredAtUtc.Date)
                .ToDictionary(
                    g => g.Key,
                    g => g.Sum(t => ConvertAmount(t.Money.CurrencyCode, t.Money.Amount, t.OccurredAtUtc)));

            var dailyDiscretionary = monthExpenses
                .Where(t => !t.IsMandatory)
                .GroupBy(t => t.OccurredAtUtc.Date)
                .ToDictionary(
                    g => g.Key,
                    g => g.Sum(t => ConvertAmount(t.Money.CurrencyCode, t.Money.Amount, t.OccurredAtUtc)));

            var monthTotal = dailyTotals.Values.Sum();
            var discretionaryTotal = dailyDiscretionary.Values.Sum();
            var observedDays = dailyTotals.Count;

            var meanDaily = observedDays > 0 ? Round2(monthTotal / observedDays) : 0m;
            var savingsRate = monthIncome > 0
                ? Round2((monthIncome - monthTotal) / monthIncome)
                : (decimal?)null;
            var discretionaryPercent = monthTotal > 0
                ? Round2(discretionaryTotal / monthTotal * 100)
                : 0m;

            decimal? stabilityIndex = null;
            if (observedDays >= 4)
            {
                var dailyValues = dailyTotals.Values.ToList();
                var median = ComputeMedian(dailyValues);
                if (median is > 0m)
                {
                    var q1 = ComputeQuantile(dailyValues, 0.25d);
                    var q3 = ComputeQuantile(dailyValues, 0.75d);
                    if (q1.HasValue && q3.HasValue)
                        stabilityIndex = Round2((q3.Value - q1.Value) / median.Value);
                }
            }

            decimal? peakDayRatio = null;
            if (dailyDiscretionary.Count >= 1)
            {
                var discValues = dailyDiscretionary.Values.Where(v => v > 0m).ToList();
                if (discValues.Count > 0)
                {
                    var discMedian = ComputeMedian(discValues) ?? 0m;
                    var threshold = ComputePeakThreshold(discValues, discMedian);
                    var peakCount = discValues.Count(v => v >= threshold);
                    var daysInMonth = DateTime.DaysInMonth(monthStart.Year, monthStart.Month);
                    peakDayRatio = Round2((decimal)peakCount / daysInMonth * 100);
                }
            }

            var rateAtUtc = monthEnd.AddTicks(-1);
            var netWorth = accountSnapshots.Sum(account =>
                ConvertAmountWithRate(account.CurrencyCode, balancesByAccount[account.Id], rateAtUtc));
            netWorth = Round2(netWorth);

            decimal? liquidMonths = null;
            if (meanDaily > 0m)
            {
                var liquidAssets = liquidAccounts.Sum(account =>
                    ConvertAmountWithRate(account.CurrencyCode, balancesByAccount[account.Id], rateAtUtc));

                liquidMonths = Round2(liquidAssets / (meanDaily * 30.44m));
            }

            result.Add(new EvolutionMonthDto(
                monthStart.Year, monthStart.Month, true,
                savingsRate, stabilityIndex, discretionaryPercent,
                netWorth, liquidMonths, meanDaily, peakDayRatio));
        }

        return result;
    }

    private static Dictionary<Guid, List<BalanceEvent>> BuildBalanceEventsByAccount(
        IReadOnlyCollection<Guid> accountIds,
        IReadOnlyDictionary<Guid, DateTime> accountCreatedAtById,
        IEnumerable<(Guid AccountId, DateTime OccurredAtUtc, decimal DeltaAmount)> transactionDeltas,
        IEnumerable<(Guid AccountId, DateTime OccurredAtUtc, decimal Amount)> adjustments,
        CancellationToken ct)
    {
        var sequencedEventsByAccount = accountIds.ToDictionary(id => id, _ => new List<(BalanceEvent Event, int Sequence)>());
        var sequence = 0;

        foreach (var txn in transactionDeltas)
        {
            ct.ThrowIfCancellationRequested();

            if (!sequencedEventsByAccount.TryGetValue(txn.AccountId, out var events))
                continue;

            events.Add((new BalanceEvent(txn.OccurredAtUtc, txn.DeltaAmount, false), sequence++));
        }

        var adjustmentsByAccount = adjustments
            .GroupBy(a => a.AccountId)
            .ToDictionary(g => g.Key, g => g.OrderBy(a => a.OccurredAtUtc).ToList());

        foreach (var accountAdjustments in adjustmentsByAccount)
        {
            ct.ThrowIfCancellationRequested();

            if (!sequencedEventsByAccount.TryGetValue(accountAdjustments.Key, out var events))
                continue;

            var normalizedAdjustments = accountAdjustments.Value
                .Select(a => new BalanceEvent(a.OccurredAtUtc, a.Amount, true))
                .ToList();

            if (normalizedAdjustments.Count == 1 &&
                accountCreatedAtById.TryGetValue(accountAdjustments.Key, out var accountCreatedAtUtc) &&
                IsOpeningBalanceAnchor(accountCreatedAtUtc, normalizedAdjustments[0].OccurredAt))
            {
                var opening = normalizedAdjustments[0];
                normalizedAdjustments[0] = new BalanceEvent(accountCreatedAtUtc, opening.Amount, true);
            }

            foreach (var adjustment in normalizedAdjustments)
                events.Add((adjustment, sequence++));
        }

        var eventsByAccount = accountIds.ToDictionary(id => id, _ => new List<BalanceEvent>());
        foreach (var accountId in accountIds)
        {
            var orderedEvents = sequencedEventsByAccount[accountId]
                .OrderBy(x => x.Event.OccurredAt)
                .ThenBy(x => x.Event.IsAdjustment ? 1 : 0)
                .ThenBy(x => x.Sequence)
                .Select(x => x.Event)
                .ToList();

            eventsByAccount[accountId] = orderedEvents;
        }

        return eventsByAccount;
    }

    private static void AdvanceBalancesToBoundary(
        DateTime boundaryUtc,
        IReadOnlyCollection<Guid> accountIds,
        IReadOnlyDictionary<Guid, List<BalanceEvent>> eventsByAccount,
        IDictionary<Guid, decimal> balancesByAccount,
        IDictionary<Guid, int> eventIndexByAccount,
        CancellationToken ct)
    {
        foreach (var accountId in accountIds)
        {
            ct.ThrowIfCancellationRequested();

            if (!eventsByAccount.TryGetValue(accountId, out var events))
                continue;

            var idx = eventIndexByAccount[accountId];
            var currentBalance = balancesByAccount[accountId];

            while (idx < events.Count && events[idx].OccurredAt < boundaryUtc)
            {
                currentBalance = ApplyBalanceEvent(currentBalance, events[idx]);
                idx++;
            }

            balancesByAccount[accountId] = currentBalance;
            eventIndexByAccount[accountId] = idx;
        }
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
