using System.Globalization;
using FinTree.Application.Analytics.Dto;
using FinTree.Application.Analytics.Services.Metrics;
using FinTree.Application.Analytics.Shared;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Application.Users;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Analytics.Services;

public sealed class DashboardService(
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter,
    UserService userService,
    LiquidityService liquidityService,
    ForecastService forecastService)
{
    public async Task<AnalyticsDashboardDto> GetDashboardAsync(int year, int month, CancellationToken ct)
    {
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

            var rateKey = (txn.Money.CurrencyCode, txn.OccurredAtUtc.Date);
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
                    categoryTotals = new CategoryTotals(Total: categoryTotals.Total + amount,
                        MandatoryTotal: categoryTotals.MandatoryTotal + (txn.IsMandatory ? amount : 0m),
                        DiscretionaryTotal: categoryTotals.DiscretionaryTotal + (txn.IsMandatory ? 0m : amount));
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
            var dayAmount = dailyTotals.GetValueOrDefault(dateKey, 0m);
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
            ? MathService.ComputeMedian(positiveObservedDailyValues)
            : null;

        var stability = StabilityService.ComputeStability(positiveObservedDailyValues);

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

        var peaks = PeakDaysService.Calculate(dailyTotalsDiscretionary, totalExpenses, daysInMonth);

        var categoryItems = currentExpenseCategoryTotals.Select(kv =>
        {
            if (!categories.TryGetValue(kv.Key, out var info))
                info = new CategoryMeta("Без категории", "#9e9e9e", false);
            var percent = totalExpenses > 0m ? (kv.Value.Total / totalExpenses) * 100 : (decimal?)null;
            return new CategoryBreakdownItemDto(
                kv.Key,
                info.Name,
                info.Color,
                MathService.Round2(kv.Value.Total),
                MathService.Round2(kv.Value.MandatoryTotal),
                MathService.Round2(kv.Value.DiscretionaryTotal),
                percent,
                info.IsMandatory);
        }).OrderByDescending(x => x.Amount).ToList();

        var incomeCategoryItems = currentIncomeCategoryTotals.Select(kv =>
        {
            if (!categories.TryGetValue(kv.Key, out var info))
                info = new CategoryMeta("Без категории", "#9e9e9e", false);
            var rawAmount = kv.Value;
            var amount = MathService.Round2(rawAmount);
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

        var categoryDelta = CategoryDeltaService.GetCategoryDeltas(
            currentExpenseCategoryTotals.ToDictionary(kv => kv.Key, kv => kv.Value.Total),
            averagedPriorTotals,
            categories);

        var spending = await BuildSpendingBreakdownAsync(year, month, baseCurrencyCode, monthStartUtc, monthEndUtc, ct);

        var forecast =
            await forecastService.BuildForecastAsync(year, month, dailyTotals, baseCurrencyCode, ct);

        var liquidityAtUtc = nowUtc;
        if (!isSelectedCurrentMonth)
            liquidityAtUtc = monthEndUtc;
        
        var liquidity = await liquidityService.ComputeLiquidity(baseCurrencyCode, liquidityAtUtc, ct);

        var totalMonthScore = MonthlyScoreService.CalculateTotalMonthScore(savingsRate, liquidity.LiquidMonths,
            stability?.Index, discretionaryShare, peaks.PeakSpendSharePercent);

        var health = new FinancialHealthSummaryDto(
            MonthIncome: MathService.Round2(totalIncome),
            MonthTotal: MathService.Round2(totalExpenses),
            MeanDaily: meanDaily.HasValue ? MathService.Round2(meanDaily.Value) : null,
            MedianDaily: medianDaily.HasValue ? MathService.Round2(medianDaily.Value) : null,
            StabilityIndex: stability?.Index,
            StabilityScore: (int?)stability?.Score,
            StabilityStatus: stability?.Status,
            StabilityActionCode: stability?.ActionCode,
            SavingsRate: savingsRate,
            NetCashflow: MathService.Round2(netCashflow),
            DiscretionaryTotal: MathService.Round2(discretionaryTotal),
            DiscretionarySharePercent: discretionaryShare,
            MonthOverMonthChangePercent: monthOverMonth,
            LiquidAssets: MathService.Round2(liquidity.LiquidAssets),
            LiquidMonths: liquidity.LiquidMonths,
            LiquidMonthsStatus: liquidity.Status,
            TotalMonthScore: (int?)totalMonthScore,
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

    private async Task<SpendingBreakdownDto> BuildSpendingBreakdownAsync(int year, int month, string baseCurrencyCode,
        DateTime monthStartUtc, DateTime monthEndUtc, CancellationToken ct)
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

            var rateKey = (expense.Money.CurrencyCode, expense.OccurredAtUtc.Date);
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
                var amount = dailyTotals.GetValueOrDefault(dateCursor, 0m);
                days.Add(new MonthlyExpensesDto(
                    dateCursor.Year,
                    dateCursor.Month,
                    dateCursor.Day,
                    null,
                    MathService.Round2(amount)));
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
            var dayAmount = dailyTotals.GetValueOrDefault(dayCursor, 0m);
            var dayDateTime = dayCursor.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var isoYear = ISOWeek.GetYear(dayDateTime);
            var isoWeek = ISOWeek.GetWeekOfYear(dayDateTime);
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
                var weekStart =
                    ISOWeek.ToDateTime(kv.Key.IsoYear, kv.Key.IsoWeek, DayOfWeek.Monday);
                return new MonthlyExpensesDto(
                    kv.Key.IsoYear,
                    weekStart.Month,
                    null,
                    kv.Key.IsoWeek,
                    MathService.Round2(kv.Value));
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
                var monthTotal = monthTotals.GetValueOrDefault(monthKey, 0m);
                months.Add(new MonthlyExpensesDto(
                    monthCursor.Year,
                    monthCursor.Month,
                    null,
                    null,
                    MathService.Round2(monthTotal)));
                monthCursor = monthCursor.AddMonths(1);
            }
        }

        return new SpendingBreakdownDto(days, weeksResult, months);
    }
}