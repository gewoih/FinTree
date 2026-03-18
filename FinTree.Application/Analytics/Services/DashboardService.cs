using FinTree.Application.Analytics.Dto;
using FinTree.Application.Analytics.Services.Metrics;
using FinTree.Application.Analytics.Shared;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Application.Users;

namespace FinTree.Application.Analytics.Services;

public sealed class DashboardService(
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter,
    UserService userService,
    LiquidityService liquidityService,
    ForecastService forecastService,
    SpendingBreakdownService spendingBreakdownService)
{
    public async Task<AnalyticsDashboardDto> GetDashboardAsync(int year, int month, CancellationToken ct)
    {
        var baseCurrencyCode = await userService.GetCurrentUserBaseCurrencyCodeAsync(ct);

        var monthStartUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEndUtc = monthStartUtc.AddMonths(1);
        var previousMonthStartUtc = monthStartUtc.AddMonths(-1);
        var deltaWindowStartUtc = monthStartUtc.AddDays(-90);
        var nowUtc = DateTime.UtcNow;

        var categories = (await userService.GetUserCategoriesAsync(ct))
            .ToDictionary(c => c.Id, c => new CategoryMeta(c.Name, c.Color, c.IsMandatory));

        const int requiredExpenseDays = 7;
        const int requiredStabilityDays = 1;
        var observedExpenseDays = await transactionsService.GetDistinctExpenseDaysCountAsync(ct);

        var transactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: deltaWindowStartUtc,
            toUtc: monthEndUtc,
            excludeTransfers: true,
            excludeInvestmentAccounts: true,
            ct: ct);

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            transactions.Select(txn => (txn.Money.CurrencyCode, txn.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var monthlyResult = MonthlyAggregator.Aggregate(
            transactions,
            rateByCurrencyAndDay,
            monthStartUtc,
            monthEndUtc,
            previousMonthStartUtc,
            deltaWindowStartUtc,
            ct);

        var daysInMonth = DateTime.DaysInMonth(year, month);
        var isSelectedCurrentMonth = monthStartUtc.Year == nowUtc.Year && monthStartUtc.Month == nowUtc.Month;
        var observedDaysInMonth = isSelectedCurrentMonth
            ? Math.Min(nowUtc.Day, daysInMonth)
            : daysInMonth;

        var observedDailyValues = Enumerable.Range(1, observedDaysInMonth)
            .Select(day => monthlyResult.DailyTotals.GetValueOrDefault(new DateOnly(year, month, day), 0m))
            .ToList();

        var positiveObservedDailyValues = observedDailyValues.Where(v => v > 0m).ToList();
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

        var netCashflow = monthlyResult.TotalIncome - monthlyResult.TotalExpenses;
        var savingsRate = monthlyResult.TotalIncome > 0m ? netCashflow / monthlyResult.TotalIncome : (decimal?)null;
        var discretionaryShare = monthlyResult.TotalExpenses > 0m
            ? (monthlyResult.DiscretionaryTotal / monthlyResult.TotalExpenses) * 100
            : (decimal?)null;
        var monthOverMonth = monthlyResult.PreviousMonthExpenses > 0m
            ? (monthlyResult.TotalExpenses - monthlyResult.PreviousMonthExpenses) / monthlyResult.PreviousMonthExpenses * 100
            : (decimal?)null;
        var incomeMoM = monthlyResult.PreviousMonthIncome > 0m
            ? (monthlyResult.TotalIncome - monthlyResult.PreviousMonthIncome) / monthlyResult.PreviousMonthIncome * 100
            : (decimal?)null;

        var previousNetCashflow = monthlyResult.PreviousMonthIncome - monthlyResult.PreviousMonthExpenses;
        // Math.Abs: процент отражает направление изменения, а не знак предыдущего кешфлоу.
        var balanceMoM = previousNetCashflow != 0m
            ? (netCashflow - previousNetCashflow) / Math.Abs(previousNetCashflow) * 100
            : (decimal?)null;

        var peaks = PeakDaysService.Calculate(monthlyResult.DailyTotalsDiscretionary, monthlyResult.DiscretionaryTotal, daysInMonth);

        var categoryDelta = CategoryDeltaService.GetCategoryDeltas(
            monthlyResult.ExpenseCategoryTotals,
            monthlyResult.PriorExpenseCategoryTotalsByMonth,
            monthlyResult.PriorExpenseDaysByMonth,
            categories);

        var liquidityAtUtc = isSelectedCurrentMonth ? nowUtc : monthEndUtc;
        var liquidity = await liquidityService.ComputeLiquidity(baseCurrencyCode, liquidityAtUtc, ct);

        var totalMonthScore = MonthlyScoreService.CalculateTotalMonthScore(
            savingsRate, liquidity.LiquidMonths, stability?.Score, discretionaryShare, peaks.PeakSpendSharePercent);
        var totalMonthScoreValue = ToScoreValue(totalMonthScore);

        var previousSavingsRate = monthlyResult.PreviousMonthIncome > 0m
            ? previousNetCashflow / monthlyResult.PreviousMonthIncome
            : (decimal?)null;
        var previousDiscretionaryShare = monthlyResult.PreviousMonthExpenses > 0m
            ? (monthlyResult.PreviousMonthDiscretionaryTotal / monthlyResult.PreviousMonthExpenses) * 100
            : (decimal?)null;
        var previousMonthPositiveDailyValues = monthlyResult.PreviousMonthDailyTotals.Values
            .Where(value => value > 0m)
            .ToList();
        var previousStability = StabilityService.ComputeStability(previousMonthPositiveDailyValues);
        var previousMonthDaysCount = DateTime.DaysInMonth(previousMonthStartUtc.Year, previousMonthStartUtc.Month);
        var previousMonthPeaks = PeakDaysService.Calculate(
            monthlyResult.PreviousMonthDailyTotalsDiscretionary,
            monthlyResult.PreviousMonthDiscretionaryTotal,
            previousMonthDaysCount);
        var previousLiquidity = await liquidityService.ComputeLiquidity(baseCurrencyCode, monthStartUtc, ct);
        var previousTotalMonthScore = MonthlyScoreService.CalculateTotalMonthScore(
            previousSavingsRate,
            previousLiquidity.LiquidMonths,
            previousStability?.Score,
            previousDiscretionaryShare,
            previousMonthPeaks.PeakSpendSharePercent);
        var previousTotalMonthScoreValue = ToScoreValue(previousTotalMonthScore);
        var totalMonthScoreDeltaPoints =
            totalMonthScoreValue.HasValue && previousTotalMonthScoreValue.HasValue
                ? totalMonthScoreValue.Value - previousTotalMonthScoreValue.Value
                : (int?)null;

        var health = new FinancialHealthSummaryDto(
            MonthIncome: MathService.Round2(monthlyResult.TotalIncome),
            MonthTotal: MathService.Round2(monthlyResult.TotalExpenses),
            MeanDaily: meanDaily.HasValue ? MathService.Round2(meanDaily.Value) : null,
            MedianDaily: medianDaily.HasValue ? MathService.Round2(medianDaily.Value) : null,
            StabilityIndex: stability?.Index,
            StabilityScore: (int?)stability?.Score,
            StabilityStatus: stability?.Status,
            StabilityActionCode: stability?.ActionCode,
            StabilityIsPreview: stability?.IsPreview ?? false,
            SavingsRate: savingsRate,
            NetCashflow: MathService.Round2(netCashflow),
            DiscretionaryTotal: MathService.Round2(monthlyResult.DiscretionaryTotal),
            DiscretionarySharePercent: discretionaryShare,
            MonthOverMonthChangePercent: monthOverMonth,
            LiquidAssets: MathService.Round2(liquidity.LiquidAssets),
            LiquidMonths: liquidity.LiquidMonths,
            LiquidMonthsStatus: liquidity.Status,
            TotalMonthScore: totalMonthScoreValue,
            TotalMonthScoreDeltaPoints: totalMonthScoreDeltaPoints,
            IncomeMonthOverMonthChangePercent: incomeMoM,
            BalanceMonthOverMonthChangePercent: balanceMoM);

        var forecast = await forecastService.BuildForecastAsync(
            year, month, monthlyResult.DailyTotals.ToDictionary(), baseCurrencyCode, ct);

        // Only meaningful when income is tracked; null suppresses the callout on the frontend.
        var availableAmount = monthlyResult.TotalIncome > 0 && forecast.Summary.MedianTotal.HasValue
            ? MathService.Round2(monthlyResult.TotalIncome - forecast.Summary.MedianTotal.Value)
            : (decimal?)null;

        var updatedSummary = forecast.Summary with { AvailableAmount = availableAmount };
        forecast = forecast with { Summary = updatedSummary };

        var spending = await spendingBreakdownService.BuildAsync(year, month, baseCurrencyCode, ct);

        return new AnalyticsDashboardDto(
            year,
            month,
            health,
            peaks.Summary,
            peaks.Days,
            new CategoryBreakdownDto(
                CategoryItemBuilder.BuildExpenseItems(monthlyResult.ExpenseCategoryTotals, categories, monthlyResult.TotalExpenses),
                categoryDelta),
            new CategoryBreakdownDto(
                CategoryItemBuilder.BuildIncomeItems(monthlyResult.IncomeCategoryTotals, categories, monthlyResult.TotalIncome),
                new CategoryDeltaDto([], [])),
            spending,
            forecast,
            readiness);
    }

    private static int? ToScoreValue(decimal? score)
        => score.HasValue ? (int?)score.Value : null;
}
