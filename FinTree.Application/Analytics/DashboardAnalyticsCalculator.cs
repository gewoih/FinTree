using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Application.Users;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Analytics;

internal sealed class DashboardAnalyticsCalculator(
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter,
    UserService userService,
    IPeakMetricsService peakMetricsService,
    ILiquidityMonthsService liquidityMonthsService,
    ITotalMonthScoreService totalMonthScoreService)
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
        var currentExpenseCategoryTotals = new Dictionary<Guid, CategoryTotals>();
        var currentIncomeCategoryTotals = new Dictionary<Guid, decimal>();
        var priorExpenseCategoryTotals = new Dictionary<Guid, decimal>();
        var priorMonthsWithData = new HashSet<(int Year, int Month)>();

        var totalIncome = 0m;
        var totalExpenses = 0m;
        var previousMonthExpenses = 0m;
        var previousMonthIncome = 0m;
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
                {
                    totalIncome += amount;
                    if (currentIncomeCategoryTotals.TryGetValue(txn.CategoryId, out var currentIncome))
                        currentIncomeCategoryTotals[txn.CategoryId] = currentIncome + amount;
                    else
                        currentIncomeCategoryTotals[txn.CategoryId] = amount;
                }

                if (isPreviousMonth)
                    previousMonthIncome += amount;

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

                if (currentExpenseCategoryTotals.TryGetValue(txn.CategoryId, out var categoryTotals))
                {
                    categoryTotals = categoryTotals with
                    {
                        Total = categoryTotals.Total + amount,
                        MandatoryTotal = categoryTotals.MandatoryTotal + (txn.IsMandatory ? amount : 0m),
                        DiscretionaryTotal = categoryTotals.DiscretionaryTotal + (txn.IsMandatory ? 0m : amount)
                    };
                    currentExpenseCategoryTotals[txn.CategoryId] = categoryTotals;
                }
                else
                {
                    currentExpenseCategoryTotals[txn.CategoryId] = new CategoryTotals(
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
                if (priorExpenseCategoryTotals.TryGetValue(txn.CategoryId, out var priorTotal))
                    priorExpenseCategoryTotals[txn.CategoryId] = priorTotal + amount;
                else
                    priorExpenseCategoryTotals[txn.CategoryId] = amount;
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

        var incomeMoM = previousMonthIncome > 0m
            ? (totalIncome - previousMonthIncome) / previousMonthIncome * 100
            : (decimal?)null;

        var previousNetCashflow = previousMonthIncome - previousMonthExpenses;
        // Use Math.Abs so the percentage sign reflects direction of change, not the sign of the previous cashflow.
        var balanceMoM = previousNetCashflow != 0m
            ? (netCashflow - previousNetCashflow) / Math.Abs(previousNetCashflow) * 100
            : (decimal?)null;

        var peaks = peakMetricsService.Calculate(dailyTotalsDiscretionary, totalExpenses, daysInMonth);

        var categoryItems = currentExpenseCategoryTotals.Select(kv =>
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

        var incomeCategoryItems = currentIncomeCategoryTotals.Select(kv =>
        {
            if (!categories.TryGetValue(kv.Key, out var info))
                info = new CategoryMeta("Без категории", "#9e9e9e", false);
            var rawAmount = kv.Value;
            var amount = AnalyticsMath.Round2(rawAmount);
            var percent = totalIncome > 0m ? (rawAmount / totalIncome) * 100 : (decimal?)null;
            return new CategoryBreakdownItemDto(
                kv.Key,
                info.Name,
                info.Color,
                amount,
                0m,
                0m,
                percent,
                info.IsMandatory);
        }).OrderByDescending(x => x.Amount).ToList();

        var priorMonthCount = Math.Max(priorMonthsWithData.Count, 1);
        var averagedPriorTotals = priorExpenseCategoryTotals
            .ToDictionary(kv => kv.Key, kv => kv.Value / priorMonthCount);

        var categoryDelta = BuildCategoryDelta(
            currentExpenseCategoryTotals.ToDictionary(kv => kv.Key, kv => kv.Value.Total),
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

        var liquidAssets = await liquidityMonthsService.GetLiquidAssetsAtAsync(baseCurrencyCode, monthEndUtc, ct);
        var averageDailyExpense = await liquidityMonthsService.GetAverageDailyExpenseAsync(baseCurrencyCode, monthEndUtc, ct);
        var liquidMonths = liquidityMonthsService.ComputeLiquidMonths(liquidAssets, averageDailyExpense);
        var liquidStatus = AnalyticsMath.ResolveLiquidStatus(liquidMonths);
        var totalMonthScore = totalMonthScoreService.CalculateTotalMonthScore(
            savingsRate,
            liquidMonths,
            stabilityScore,
            discretionaryShare,
            peaks.PeakSpendSharePercent);

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
            LiquidMonthsStatus: liquidStatus,
            TotalMonthScore: totalMonthScore,
            IncomeMonthOverMonthChangePercent: incomeMoM,
            BalanceMonthOverMonthChangePercent: balanceMoM);

        return new AnalyticsDashboardDto(
            year,
            month,
            health,
            peaks.Summary,
            peaks.Days,
            new CategoryBreakdownDto(categoryItems, categoryDelta),
            new CategoryBreakdownDto(incomeCategoryItems, new CategoryDeltaDto([], [])),
            spending,
            forecast,
            readiness);
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

        if (forecastDailyTotals.Count > 0)
        {
            var firstDay = forecastDailyTotals.Keys.Min().ToDateTime(TimeOnly.MinValue);
            if (firstDay > forecastStart)
                forecastStart = firstDay;
        }
        
        // Build pool — exclude today (partial day) when viewing current month
        var poolEnd = isCurrentMonth ? forecastEnd.AddDays(-1) : forecastEnd;
        var poolDays = Math.Clamp((int)(poolEnd - forecastStart).TotalDays + 1, 0, 180);
        
        var pool = new decimal[poolDays];
        for (var i = 0; i < poolDays; i++)
        {
            var dateKey = DateOnly.FromDateTime(forecastStart.AddDays(i));
            pool[i] = forecastDailyTotals.TryGetValue(dateKey, out var v) ? v : 0m;
        }
        
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var observedDays = isCurrentMonth
            ? Math.Min(nowUtc.Day, daysInMonth)
            : daysInMonth;
        
        var observedCumulativeActual = 0m;
        {
            var runningTotal = 0m;
            for (var day = 1; day <= observedDays; day++)
            {
                var dateKey = new DateOnly(year, month, day);
                runningTotal += dailyTotals.TryGetValue(dateKey, out var v) ? v : 0m;
            }
            observedCumulativeActual = runningTotal;
        }
        
        decimal? optimisticTotal = null;
        decimal? riskTotal = null;
        decimal? optimisticDaily = null;
        decimal? riskDaily = null;

        // On the last day of the current month today is still in progress, so treat it as 1 remaining day.
        var remainingDays = isCurrentMonth && nowUtc.Day == daysInMonth
            ? 1
            : Math.Max(daysInMonth - observedDays, 0);

        if (remainingDays > 0 && pool.Length >= 10)
        {
            static long ToCents(decimal x) => (long)Math.Round(x * 100m, MidpointRounding.AwayFromZero);
            
            const int simCount = 1000;
            var simTotals = new decimal[simCount];
            var seed = 42;
            seed = HashCode.Combine(seed, year, month, observedDays, remainingDays, ToCents(observedCumulativeActual));
            seed = pool.Aggregate(seed, (current, t) => HashCode.Combine(current, ToCents(t)));

            var rng = new Random(seed);

            for (var s = 0; s < simCount; s++)
            {
                var total = observedCumulativeActual;
                for (var r = 0; r < remainingDays; r++)
                    total += pool[rng.Next(pool.Length)];
                simTotals[s] = total;
            }

            Array.Sort(simTotals);
            optimisticTotal = simTotals[350]; // P35
            riskTotal = simTotals[850]; // P85

            optimisticDaily = (optimisticTotal.Value - observedCumulativeActual) / remainingDays;
            riskDaily = (riskTotal.Value - observedCumulativeActual) / remainingDays;
        }

        var days = new List<int>(daysInMonth);
        var actual = new List<decimal?>(daysInMonth);
        var optimistic = new List<decimal?>(daysInMonth);
        var risk = new List<decimal?>(daysInMonth);

        var cumulative = 0m;
        var observedCumulative = 0m;
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

            risk.Add(BuildForecastScenarioPoint(
                riskDaily,
                isCurrentMonth,
                day,
                observedDays,
                cumulative,
                observedCumulative));
        }

        var currentSpent = isCurrentMonth
            ? AnalyticsMath.Round2(observedCumulativeActual)
            : AnalyticsMath.Round2(cumulative);
        
        var baselineDailyRate = await liquidityMonthsService.GetAverageDailyExpenseAsync(baseCurrencyCode, forecastEnd.AddDays(1), ct);
        var baselineLimit = baselineDailyRate > 0m
            ? AnalyticsMath.Round2(baselineDailyRate * daysInMonth)
            : (decimal?)null;

        var summary = new ForecastSummaryDto(
            optimisticTotal,
            riskTotal,
            currentSpent,
            baselineLimit);
        var series = new ForecastSeriesDto(days, actual, optimistic, risk, baselineLimit);
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

}
