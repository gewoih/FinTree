using FinTree.Application.Abstractions;
using FinTree.Application.Analytics.Services;
using FinTree.Application.Analytics.Shared;
using FinTree.Application.Currencies;
using FinTree.Application.Exceptions;
using FinTree.Application.Goals.Dto;
using FinTree.Application.Transactions;
using FinTree.Application.Users;
using FinTree.Domain.Goals;
using FinTree.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Goals.Services;

public sealed class GoalSimulationService(
    IAppDbContext context,
    ICurrentUser currentUser,
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter,
    ExpenseService expenseService,
    NetWorthService netWorthService,
    UserService userService)
{
    private const int SimulationCount = 10_000;
    private const int MaxHorizonMonths = 360;
    private const int DisplayMonths = 120;
    private const double Lambda = 0.02;
    private const int BaselineMonthsBack = 3;

    public async Task<Goal> LoadGoalForSimulationAsync(Guid goalId, CancellationToken ct)
    {
        var userId = currentUser.Id;

        return await context.Goals
            .AsNoTracking()
            .Where(g => g.Id == goalId && g.UserId == userId)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(Goal), goalId);
    }

    public async Task<GoalSimulationResultDto> SimulateAsync(
        Goal goal,
        GoalSimulationRequestDto request,
        CancellationToken ct)
    {
        var nowUtc = DateTime.UtcNow;
        var baseCurrencyCode = await userService.GetCurrentUserBaseCurrencyCodeAsync(ct);

        var capitalFromAnalytics = !request.InitialCapital.HasValue;
        var initialCapital = request.InitialCapital ?? await ResolveInitialCapitalAsync(ct);

        var incomeFromAnalytics = !request.MonthlyIncome.HasValue;
        var monthlyIncome = request.MonthlyIncome
            ?? await ResolveMonthlyAverageAsync(baseCurrencyCode, nowUtc, TransactionType.Income, ct);

        var expensesFromAnalytics = !request.MonthlyExpenses.HasValue;
        decimal monthlyExpenses;
        decimal[] bootstrapPool;

        if (request.MonthlyExpenses.HasValue)
        {
            monthlyExpenses = request.MonthlyExpenses.Value;
            var avgDailyExpense = monthlyExpenses / (decimal)AnalyticsCommon.AverageDaysInMonth;
            bootstrapPool = Enumerable.Repeat(avgDailyExpense, 90).ToArray();
        }
        else
        {
            monthlyExpenses = await ResolveMonthlyAverageAsync(baseCurrencyCode, nowUtc, TransactionType.Expense, ct);
            bootstrapPool = await BuildBootstrapPoolAsync(baseCurrencyCode, nowUtc, ct);

            // Rescale the pool so that its mean aligns with the baseline monthly average.
            // The pool captures variance from a long window; we normalise it to avoid drift.
            var targetDailyMean = monthlyExpenses / (decimal)AnalyticsCommon.AverageDaysInMonth;
            if (bootstrapPool.Length > 0 && targetDailyMean > 0m)
            {
                var poolMean = bootstrapPool.Sum() / bootstrapPool.Length;
                if (poolMean > 0m)
                {
                    var scale = targetDailyMean / poolMean;
                    for (var i = 0; i < bootstrapPool.Length; i++)
                        bootstrapPool[i] *= scale;
                }
            }
        }

        var annualReturnRate = request.AnnualReturnRate ?? 0m;

        var resolvedParams = new GoalSimulationParametersDto(
            initialCapital,
            monthlyIncome,
            monthlyExpenses,
            annualReturnRate,
            capitalFromAnalytics,
            incomeFromAnalytics,
            expensesFromAnalytics);

        var avgMonthlySavings = monthlyIncome - monthlyExpenses;
        var isAchievable = avgMonthlySavings > 0 || initialCapital >= goal.TargetAmount;

        if (!isAchievable)
            return BuildUnachievableResult(resolvedParams);

        var cdf = BuildWeightedCdf(bootstrapPool);
        var rng = new Random(42);

        var horizonMonths = Math.Clamp(request.HorizonMonths ?? MaxHorizonMonths, 1, MaxHorizonMonths);
        var monthlyReturn = (double)annualReturnRate / 12d;

        var displayLen = Math.Min(horizonMonths, DisplayMonths);
        var allPaths = new decimal[SimulationCount][];
        var hitMonths = new int[SimulationCount];
        Array.Fill(hitMonths, -1);

        for (var simulationIndex = 0; simulationIndex < SimulationCount; simulationIndex++)
        {
            allPaths[simulationIndex] = new decimal[displayLen + 1];
            allPaths[simulationIndex][0] = initialCapital;
            var capital = initialCapital;

            for (var month = 1; month <= horizonMonths; month++)
            {
                var sampledDailyExpense = SampleFromPool(bootstrapPool, cdf, rng);
                var sampledMonthlyExpense = sampledDailyExpense * (decimal)AnalyticsCommon.AverageDaysInMonth;
                var savings = monthlyIncome - sampledMonthlyExpense;

                capital = capital * (1m + (decimal)monthlyReturn) + savings;

                if (month <= displayLen)
                    allPaths[simulationIndex][month] = capital;

                if (capital >= goal.TargetAmount && hitMonths[simulationIndex] == -1)
                    hitMonths[simulationIndex] = month;
            }
        }

        var successMonths = hitMonths
            .Where(month => month >= 0)
            .OrderBy(month => month)
            .ToArray();

        var probability = (double)successMonths.Length / SimulationCount;
        var medianMonths = successMonths.Length > 0 ? successMonths[successMonths.Length / 2] : -1;
        var p25Months = successMonths.Length > 0 ? successMonths[(int)(successMonths.Length * 0.25)] : -1;
        var p75Months = successMonths.Length > 0 ? successMonths[(int)(successMonths.Length * 0.75)] : -1;

        var percentilePaths = ComputePercentilePaths(allPaths, displayLen);
        var monthLabels = BuildMonthLabels(nowUtc, displayLen);

        var insights = GenerateInsights(
            probability,
            successMonths,
            monthlyIncome,
            monthlyExpenses,
            annualReturnRate,
            goal.TargetAmount,
            initialCapital);

        return new GoalSimulationResultDto(
            probability,
            medianMonths,
            p25Months,
            p75Months,
            percentilePaths,
            resolvedParams,
            insights,
            true,
            monthLabels);
    }

    private async Task<decimal> ResolveInitialCapitalAsync(CancellationToken ct)
    {
        var snapshots = await netWorthService.GetNetWorthTrendAsync(1, ct);
        return snapshots.LastOrDefault()?.NetWorth ?? 0m;
    }

    /// <summary>
    /// Returns the average monthly total for the given transaction type over the last
    /// <see cref="BaselineMonthsBack"/> complete calendar months.
    /// </summary>
    private async Task<decimal> ResolveMonthlyAverageAsync(
        string baseCurrencyCode,
        DateTime nowUtc,
        TransactionType type,
        CancellationToken ct)
    {
        var monthlyTotals = new List<decimal>(BaselineMonthsBack);

        for (var i = 1; i <= BaselineMonthsBack; i++)
        {
            var refDate = nowUtc.AddMonths(-i);
            var monthStart = new DateTime(refDate.Year, refDate.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1);

            var transactions = await transactionsService.GetTransactionSnapshotsAsync(
                monthStart,
                monthEnd,
                excludeTransfers: true,
                type: type,
                ct: ct);

            if (transactions.Count == 0)
                continue;

            var rates = await currencyConverter.GetCrossRatesAsync(
                transactions.Select(t => (t.Money.CurrencyCode, t.OccurredAtUtc)),
                baseCurrencyCode,
                ct);

            var total = transactions.Sum(t =>
                t.Money.Amount * rates[(t.Money.CurrencyCode, t.OccurredAtUtc.Date)]);

            monthlyTotals.Add(total);
        }

        return monthlyTotals.Count > 0 ? monthlyTotals.Average() : 0m;
    }

    private async Task<decimal[]> BuildBootstrapPoolAsync(string baseCurrencyCode, DateTime nowUtc, CancellationToken ct)
    {
        var fromUtc = nowUtc.AddDays(-AnalyticsCommon.AverageExpenseRollingWindowDays);
        var transactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc,
            nowUtc,
            excludeTransfers: true,
            type: TransactionType.Expense,
            ct: ct);

        if (transactions.Count == 0)
            return [0m];

        var rates = await currencyConverter.GetCrossRatesAsync(
            transactions.Select(t => (t.Money.CurrencyCode, t.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var dailyTotals = new Dictionary<DateOnly, decimal>();
        foreach (var transaction in transactions)
        {
            var rateKey = (transaction.Money.CurrencyCode, transaction.OccurredAtUtc.Date);
            var amount = transaction.Money.Amount * rates[rateKey];
            var day = DateOnly.FromDateTime(transaction.OccurredAtUtc);
            dailyTotals[day] = dailyTotals.GetValueOrDefault(day, 0m) + amount;
        }

        var poolDays = (int)(nowUtc - fromUtc).TotalDays + 1;
        var pool = new decimal[poolDays];
        for (var dayIndex = 0; dayIndex < poolDays; dayIndex++)
        {
            var day = DateOnly.FromDateTime(fromUtc.AddDays(dayIndex));
            pool[dayIndex] = dailyTotals.GetValueOrDefault(day, 0m);
        }

        return pool;
    }

    private static double[] BuildWeightedCdf(decimal[] pool)
    {
        var cdf = new double[pool.Length];
        var weightSum = 0.0;

        for (var i = 0; i < pool.Length; i++)
        {
            var age = pool.Length - 1 - i;
            weightSum += Math.Exp(-Lambda * age);
            cdf[i] = weightSum;
        }

        for (var i = 0; i < pool.Length; i++)
            cdf[i] /= weightSum;

        return cdf;
    }

    private static decimal SampleFromPool(decimal[] pool, double[] cdf, Random rng)
    {
        var randomValue = rng.NextDouble();
        var index = Array.BinarySearch(cdf, randomValue);

        if (index < 0)
            index = ~index;

        return pool[Math.Clamp(index, 0, pool.Length - 1)];
    }

    private static GoalPercentilePathsDto ComputePercentilePaths(decimal[][] allPaths, int displayLen)
    {
        var p10 = new decimal[displayLen + 1];
        var p20 = new decimal[displayLen + 1];
        var p40 = new decimal[displayLen + 1];
        var p50 = new decimal[displayLen + 1];
        var p60 = new decimal[displayLen + 1];
        var p80 = new decimal[displayLen + 1];
        var p90 = new decimal[displayLen + 1];

        var pathCount = allPaths.Length;
        var sortBuffer = new decimal[pathCount];

        for (var month = 0; month <= displayLen; month++)
        {
            for (var simulationIndex = 0; simulationIndex < pathCount; simulationIndex++)
                sortBuffer[simulationIndex] = allPaths[simulationIndex][month];

            Array.Sort(sortBuffer);

            p10[month] = sortBuffer[(int)(pathCount * 0.10)];
            p20[month] = sortBuffer[(int)(pathCount * 0.20)];
            p40[month] = sortBuffer[(int)(pathCount * 0.40)];
            p50[month] = sortBuffer[pathCount / 2];
            p60[month] = sortBuffer[(int)(pathCount * 0.60)];
            p80[month] = sortBuffer[(int)(pathCount * 0.80)];
            p90[month] = sortBuffer[(int)(pathCount * 0.90)];
        }

        return new GoalPercentilePathsDto(p10, p20, p40, p50, p60, p80, p90);
    }

    private static IReadOnlyList<string> BuildMonthLabels(DateTime nowUtc, int count)
    {
        var labels = new string[count + 1];
        for (var month = 0; month <= count; month++)
        {
            var date = nowUtc.AddMonths(month);
            labels[month] = $"{date:MMM yyyy}";
        }

        return labels;
    }

    private static IReadOnlyList<string> GenerateInsights(
        double probability,
        int[] successMonths,
        decimal monthlyIncome,
        decimal monthlyExpenses,
        decimal annualReturnRate,
        decimal targetAmount,
        decimal initialCapital)
    {
        var insights = new List<string>();

        if (initialCapital > 0 && targetAmount > 0)
        {
            var progressPercent = Math.Round((double)initialCapital / (double)targetAmount * 100, 1);
            insights.Add($"Уже накоплено {progressPercent}% от цели ({initialCapital:N0} из {targetAmount:N0})");
        }

        if (monthlyExpenses > 0)
        {
            var reducedExpenses = monthlyExpenses * 0.9m;
            var reduction = monthlyExpenses - reducedExpenses;
            insights.Add($"Снижение расходов на {reduction:N0}/мес даст заметный прирост вероятности");
        }

        if (annualReturnRate == 0m)
        {
            insights.Add("Инвестирование сбережений под 10%/год значительно ускорит достижение цели");
        }
        else if (annualReturnRate < 0.10m)
        {
            var higherReturn = annualReturnRate + 0.05m;
            insights.Add($"Увеличение доходности до {higherReturn:P0} ускорит накопление");
        }

        if (probability < 0.5)
        {
            insights.Add("Вероятность ниже 50% — рассмотрите увеличение взносов или снижение расходов");
        }
        else if (probability >= 0.9)
        {
            insights.Add("Высокая вероятность — цель хорошо согласована с вашими финансами");
        }

        if (successMonths.Length == 0 && monthlyIncome <= monthlyExpenses)
        {
            insights.Add("Текущий денежный поток не формирует устойчивого запаса для достижения цели");
        }

        return insights;
    }

    private static GoalSimulationResultDto BuildUnachievableResult(GoalSimulationParametersDto resolvedParams)
    {
        var emptyPaths = new GoalPercentilePathsDto([], [], [], [], [], [], []);
        var insights = new List<string>
        {
            "Текущие расходы превышают доходы — накопление невозможно при таких параметрах",
            "Попробуйте увеличить доход или снизить расходы"
        };

        return new GoalSimulationResultDto(
            0,
            -1,
            -1,
            -1,
            emptyPaths,
            resolvedParams,
            insights,
            false,
            []);
    }
}
