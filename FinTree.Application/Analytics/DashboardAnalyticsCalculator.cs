using FinTree.Application.Accounts;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Application.Users;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;

namespace FinTree.Application.Analytics;

internal sealed class DashboardAnalyticsCalculator(
    AccountsService accountsService,
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter,
    UserService userService)
    : IDashboardAnalyticsCalculator
{
    private readonly record struct CategoryMeta(string Name, string Color, bool IsMandatory);
    private readonly record struct CategoryTotals(decimal Total, decimal MandatoryTotal, decimal DiscretionaryTotal);

    public async Task<AnalyticsDashboardDto> GetDashboardAsync(int year, int month, CancellationToken ct)
    {
        AnalyticsNormalization.ValidateYearMonth(year, month);

        var baseCurrencyCode = await userService.GetCurrentUserBaseCurrencyCodeAsync(ct);

        var monthStartUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEndUtc = monthStartUtc.AddMonths(1);
        var previousMonthStartUtc = monthStartUtc.AddMonths(-1);
        var deltaWindowStartUtc = monthStartUtc.AddMonths(-1);
        var nowUtc = DateTime.UtcNow;

        var categories = (await userService.GetUserCategoriesAsync(ct))
            .ToDictionary(c => c.Id, c => new CategoryMeta(c.Name, c.Color, c.IsMandatory));

        const int requiredExpenseDays = 7;
        const int requiredStabilityDays = 4;
        var observedExpenseDays = await transactionsService.GetDistinctExpenseDaysCountAsync(ct);

        var transactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: deltaWindowStartUtc,
            toUtc: monthEndUtc,
            excludeTransfers: true,
            ct: ct);

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            transactions.Select(txn => (txn.Money.CurrencyCode, txn.OccurredAtUtc)),
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

        foreach (var txn in transactions)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (AnalyticsNormalization.NormalizeCurrencyCode(txn.Money.CurrencyCode), txn.OccurredAtUtc.Date);
            var amount = txn.Money.Amount * rateByCurrencyAndDay[rateKey];
            var occurredUtc = txn.OccurredAtUtc;
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
                previousMonthExpenses += amount;
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

        var observedStabilityDaysInSelectedMonth = positiveObservedDailyValues.Count;
        var readiness = new AnalyticsReadinessDto(
            observedExpenseDays >= requiredExpenseDays,
            observedExpenseDays,
            requiredExpenseDays,
            observedStabilityDaysInSelectedMonth >= requiredStabilityDays,
            observedStabilityDaysInSelectedMonth,
            requiredStabilityDays);

        var meanDaily = observedDailyValues.Count > 0 ? observedDailyValues.Average() : (decimal?)null;
        var medianDaily = positiveObservedDailyValues.Count > 0
            ? AnalyticsMath.ComputeMedian(positiveObservedDailyValues)
            : null;
        var discretionaryDayValues = dailyTotalsDiscretionary.Values.Where(v => v > 0m).ToList();
        var peakMedianDaily = discretionaryDayValues.Count > 0 ? AnalyticsMath.ComputeMedian(discretionaryDayValues) : null;
        var stabilityIndexValue = AnalyticsMath.ComputeStabilityIndex(positiveObservedDailyValues);
        var stabilityIndex = stabilityIndexValue.HasValue
            ? AnalyticsMath.Round2(stabilityIndexValue.Value)
            : (decimal?)null;
        var stabilityStatus = AnalyticsMath.ResolveStabilityStatus(stabilityIndex);
        var stabilityActionCode = AnalyticsMath.ResolveStabilityActionCode(stabilityStatus);
        var stabilityScore = AnalyticsMath.ComputeStabilityScore(stabilityIndex);

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
                AnalyticsMath.Round2(kv.Value.Total),
                AnalyticsMath.Round2(kv.Value.MandatoryTotal),
                AnalyticsMath.Round2(kv.Value.DiscretionaryTotal),
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
            monthEndUtc,
            ct);

        var health = new FinancialHealthSummaryDto(
            MonthIncome: AnalyticsMath.Round2(totalIncome),
            MonthTotal: AnalyticsMath.Round2(totalExpenses),
            MeanDaily: meanDaily.HasValue ? AnalyticsMath.Round2(meanDaily.Value) : null,
            MedianDaily: medianDaily.HasValue ? AnalyticsMath.Round2(medianDaily.Value) : null,
            StabilityIndex: stabilityIndex,
            StabilityScore: stabilityScore,
            StabilityStatus: stabilityStatus,
            StabilityActionCode: stabilityActionCode,
            SavingsRate: savingsRate,
            NetCashflow: AnalyticsMath.Round2(netCashflow),
            DiscretionaryTotal: AnalyticsMath.Round2(discretionaryTotal),
            DiscretionarySharePercent: discretionaryShare,
            MonthOverMonthChangePercent: monthOverMonth,
            LiquidAssets: AnalyticsMath.Round2(liquidAssets),
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

    private static (PeakDaysSummaryDto Summary, List<PeakDayDto> Days) BuildPeakDays(
        Dictionary<DateOnly, decimal> dailyTotals,
        decimal? medianDaily,
        decimal monthTotal)
    {
        if (!medianDaily.HasValue || medianDaily.Value <= 0m || monthTotal <= 0m)
            return (new PeakDaysSummaryDto(0, 0m, null, monthTotal), new List<PeakDayDto>());

        var positiveDailyTotals = dailyTotals.Values
            .Where(value => value > 0m)
            .ToList();

        if (positiveDailyTotals.Count == 0)
            return (new PeakDaysSummaryDto(0, 0m, null, monthTotal), new List<PeakDayDto>());

        var threshold = AnalyticsMath.ComputePeakThreshold(positiveDailyTotals, medianDaily.Value);
        var peakDays = dailyTotals
            .Where(kv => kv.Value >= threshold)
            .Select(kv =>
            {
                var share = (kv.Value / monthTotal) * 100m;
                return new PeakDayDto(kv.Key.Year, kv.Key.Month, kv.Key.Day, AnalyticsMath.Round2(kv.Value), share);
            })
            .OrderByDescending(x => x.Amount)
            .ToList();

        var total = peakDays.Sum(x => x.Amount);
        var sharePercent = total > 0m ? (total / monthTotal) * 100m : (decimal?)null;

        return (new PeakDaysSummaryDto(peakDays.Count, AnalyticsMath.Round2(total), sharePercent, monthTotal), peakDays);
    }

    private async Task<(decimal LiquidAssets, decimal? LiquidMonths, string? LiquidStatus)> BuildLiquidMetricsAsync(
        string baseCurrencyCode,
        DateTime monthEndUtc,
        CancellationToken ct)
    {
        var liquidAssets = await GetLiquidAssetsAtAsync(baseCurrencyCode, monthEndUtc, ct);
        var dailyRate = await GetAverageDailyExpenseAsync(baseCurrencyCode, monthEndUtc, ct);
        var monthlyExpense180d = dailyRate * 30.44m;

        var liquidMonths = monthlyExpense180d > 0m
            ? Math.Round(liquidAssets / monthlyExpense180d, 2, MidpointRounding.AwayFromZero)
            : 0m;

        var status = AnalyticsMath.ResolveLiquidStatus(liquidMonths);
        return (liquidAssets, liquidMonths, status);
    }

    private async Task<decimal> GetAverageDailyExpenseAsync(string baseCurrencyCode, DateTime windowEnd, CancellationToken ct)
    {
        var windowStartUtc = windowEnd.AddDays(-180);

        var earliestTrackedAtRaw = await transactionsService.GetEarliestOccurredAtBeforeAsync(
            windowEnd,
            excludeTransfers: true,
            ct);

        if (!earliestTrackedAtRaw.HasValue)
            return 0m;

        var rawExpenses = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: windowStartUtc,
            toUtc: windowEnd,
            excludeTransfers: true,
            type: TransactionType.Expense,
            ct: ct);

        if (rawExpenses.Count == 0)
            return 0m;

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            rawExpenses.Select(e => (e.Money.CurrencyCode, e.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var totalExpense = 0m;
        foreach (var expense in rawExpenses)
        {
            ct.ThrowIfCancellationRequested();
            var rateKey = (AnalyticsNormalization.NormalizeCurrencyCode(expense.Money.CurrencyCode), expense.OccurredAtUtc.Date);
            totalExpense += expense.Money.Amount * rateByCurrencyAndDay[rateKey];
        }

        var effectiveStartUtc = earliestTrackedAtRaw.Value > windowStartUtc ? earliestTrackedAtRaw.Value : windowStartUtc;
        var calendarDays = (decimal)(windowEnd - effectiveStartUtc).TotalDays;

        if (calendarDays <= 0m)
            return 0m;

        return totalExpense / calendarDays;
    }

    private async Task<decimal> GetLiquidAssetsAtAsync(string baseCurrencyCode, DateTime atUtc, CancellationToken ct)
    {
        var liquidAccounts = (await accountsService.GetAccountSnapshotsAsync(includeArchived: false, ct))
            .Where(a => a.IsLiquid)
            .ToList();

        if (liquidAccounts.Count == 0)
            return 0m;

        var accountIds = liquidAccounts.Select(a => a.Id).ToList();
        var rawAdjustments = await accountsService.GetAccountAdjustmentSnapshotsAsync(accountIds, beforeUtc: atUtc, ct: ct);

        var rawTransactions = await transactionsService.GetTransactionSnapshotsAsync(
            toUtc: atUtc,
            accountIds: accountIds,
            ct: ct);

        var adjustmentsByAccount = rawAdjustments
            .GroupBy(a => a.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(a => a.OccurredAtUtc).ToList());

        var transactionsByAccount = rawTransactions
            .GroupBy(t => t.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(t => new
                    {
                        Delta = t.Type == TransactionType.Income ? t.Money.Amount : -t.Money.Amount,
                        t.OccurredAtUtc
                    })
                    .OrderBy(t => t.OccurredAtUtc)
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
                anchorAt = latestAdjustment.OccurredAtUtc;
            }

            if (transactionsByAccount.TryGetValue(account.Id, out var accountTransactions) && accountTransactions.Count > 0)
            {
                var delta = accountTransactions
                    .Where(t => !anchorAt.HasValue || t.OccurredAtUtc > anchorAt.Value)
                    .Sum(t => t.Delta);
                balance += delta;
            }

            var rate = rateByCurrency.TryGetValue(account.CurrencyCode, out var foundRate) ? foundRate : 1m;
            total += balance * rate;
        }

        return AnalyticsMath.Round2(total);
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
            if (current == 0m && previous == 0m)
                continue;
            if (previous <= 0m)
                continue;

            var delta = current - previous;
            var deltaPercent = (delta / previous) * 100m;
            if (!categories.TryGetValue(id, out var info))
                info = new CategoryMeta("Без категории", "#9e9e9e", false);

            entries.Add(new CategoryDeltaItemDto(
                id,
                info.Name,
                info.Color,
                AnalyticsMath.Round2(current),
                AnalyticsMath.Round2(previous),
                AnalyticsMath.Round2(delta),
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

        var rawExpenses = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: monthsWindowStartUtc,
            toUtc: monthEndUtc,
            excludeTransfers: true,
            type: TransactionType.Expense,
            ct: ct);

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            rawExpenses.Select(expense => (expense.Money.CurrencyCode, expense.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var dailyTotals = new Dictionary<DateOnly, decimal>();
        foreach (var expense in rawExpenses)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (AnalyticsNormalization.NormalizeCurrencyCode(expense.Money.CurrencyCode), expense.OccurredAtUtc.Date);
            var amountInBaseCurrency = expense.Money.Amount * rateByCurrencyAndDay[rateKey];

            var dayKey = DateOnly.FromDateTime(expense.OccurredAtUtc);
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
                    AnalyticsMath.Round2(amount)));
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
                    AnalyticsMath.Round2(kv.Value));
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
                    AnalyticsMath.Round2(monthTotal)));
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

        var forecastTransactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: forecastStart,
            toUtc: forecastEnd.AddTicks(1),
            excludeTransfers: true,
            type: TransactionType.Expense,
            ct: ct);

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            forecastTransactions.Select(txn => (txn.Money.CurrencyCode, txn.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var forecastDailyTotals = new Dictionary<DateOnly, decimal>();
        foreach (var txn in forecastTransactions)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (AnalyticsNormalization.NormalizeCurrencyCode(txn.Money.CurrencyCode), txn.OccurredAtUtc.Date);
            var amountInBaseCurrency = txn.Money.Amount * rateByCurrencyAndDay[rateKey];

            var dateKey = DateOnly.FromDateTime(txn.OccurredAtUtc);
            if (forecastDailyTotals.TryGetValue(dateKey, out var current))
                forecastDailyTotals[dateKey] = current + amountInBaseCurrency;
            else
                forecastDailyTotals[dateKey] = amountInBaseCurrency;
        }

        var historicalDailyTotals = forecastDailyTotals.Values
            .Where(v => v > 0m)
            .ToList();

        var optimisticDaily = AnalyticsMath.ComputeQuantile(historicalDailyTotals, 0.40d);
        var baselineDaily = AnalyticsMath.ComputeQuantile(historicalDailyTotals, 0.50d);
        var riskDaily = AnalyticsMath.ComputeQuantile(historicalDailyTotals, 0.75d);
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
                actual.Add(AnalyticsMath.Round2(cumulative));

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
            ? AnalyticsMath.Round2(observedCumulative)
            : AnalyticsMath.Round2(cumulative);
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
            ? AnalyticsMath.Round2(baselineDailyRate * daysInMonth)
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
                return AnalyticsMath.Round2(cumulativeActual);

            return AnalyticsMath.Round2(observedCumulativeActual + projectedDaily.Value * (day - observedDays));
        }

        return AnalyticsMath.Round2(projectedDaily.Value * day);
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
            return AnalyticsMath.Round2(observedCumulativeActual + projectedDaily.Value * remainingDays);
        }

        return AnalyticsMath.Round2(projectedDaily.Value * daysInMonth);
    }
}
