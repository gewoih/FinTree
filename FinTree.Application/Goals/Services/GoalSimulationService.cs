using FinTree.Application.Analytics.Services;
using FinTree.Application.Analytics.Shared;
using FinTree.Application.Currencies;
using FinTree.Application.Goals.Dto;
using FinTree.Application.Transactions;
using FinTree.Application.Users;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Goals.Services;

public sealed class GoalSimulationService(
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter,
    CashflowAverageService cashflowAverageService,
    NetWorthService netWorthService,
    UserService userService)
{
    private const int SimulationCount = 6_000;
    private const int MaxHorizonMonths = 360;
    private const int MinHorizonMonths = 24;
    private const int HorizonBufferMonths = 48;
    private const int MinHistoryDaysForVariance = 30;
    private const int SyntheticPoolSize = 120;
    private const decimal SyntheticNoiseLevel = 0.18m;
    private const double Lambda = 0.02;

    public async Task<GoalSimulationResultDto> SimulateAsync(
        GoalSimulationRequestDto request,
        CancellationToken ct)
    {
        if (request.TargetAmount <= 0m)
            throw new ArgumentOutOfRangeException(nameof(request.TargetAmount), "TargetAmount must be greater than zero.");

        var nowUtc = DateTime.UtcNow;
        var baseCurrencyCode = await userService.GetCurrentUserBaseCurrencyCodeAsync(ct);

        var capitalFromAnalytics = !request.InitialCapital.HasValue;
        var initialCapital = request.InitialCapital ?? await ResolveInitialCapitalAsync(ct);

        var incomeFromAnalytics = !request.MonthlyIncome.HasValue;
        var monthlyIncome = request.MonthlyIncome
            ?? await cashflowAverageService.GetAverageMonthlyIncomeAsync(baseCurrencyCode, nowUtc, ct);

        var expensesFromAnalytics = !request.MonthlyExpenses.HasValue;
        var monthlyExpenses = request.MonthlyExpenses
            ?? await cashflowAverageService.GetAverageMonthlyExpenseAsync(baseCurrencyCode, nowUtc, ct);

        var bootstrapSource = await BuildBootstrapPoolAsync(baseCurrencyCode, nowUtc, ct);
        var targetDailyMean = monthlyExpenses / (decimal)AnalyticsCommon.AverageDaysInMonth;
        var bootstrapPool = BuildExpensePool(bootstrapSource.Pool, targetDailyMean, bootstrapSource.ObservedDays);

        var annualReturnRate = request.AnnualReturnRate ?? 0m;
        var monthlyReturn = (double)annualReturnRate / 12d;
        var targetAmount = request.TargetAmount;

        var resolvedParams = new GoalSimulationParametersDto(
            initialCapital,
            monthlyIncome,
            monthlyExpenses,
            annualReturnRate,
            capitalFromAnalytics,
            incomeFromAnalytics,
            expensesFromAnalytics);

        var avgMonthlySavings = monthlyIncome - monthlyExpenses;
        var isAchievable = avgMonthlySavings > 0m || initialCapital >= targetAmount;

        if (!isAchievable)
            return BuildUnachievableResult(resolvedParams);

        var cdf = BuildWeightedCdf(bootstrapPool);
        var rng = new Random(42);

        var horizonMonths = EstimateHorizonMonths(
            initialCapital,
            targetAmount,
            monthlyIncome,
            monthlyExpenses,
            monthlyReturn);

        var allPaths = new decimal[SimulationCount][];
        var hitMonths = new int[SimulationCount];
        Array.Fill(hitMonths, -1);

        for (var simulationIndex = 0; simulationIndex < SimulationCount; simulationIndex++)
        {
            allPaths[simulationIndex] = new decimal[horizonMonths + 1];
            allPaths[simulationIndex][0] = initialCapital;
            var capital = initialCapital;

            if (initialCapital >= targetAmount)
                hitMonths[simulationIndex] = 0;

            for (var month = 1; month <= horizonMonths; month++)
            {
                var sampledDailyExpense = SampleFromPool(bootstrapPool, cdf, rng);
                var sampledMonthlyExpense = sampledDailyExpense * (decimal)AnalyticsCommon.AverageDaysInMonth;
                var savings = monthlyIncome - sampledMonthlyExpense;

                capital = capital * (1m + (decimal)monthlyReturn) + savings;
                allPaths[simulationIndex][month] = capital;

                if (capital >= targetAmount && hitMonths[simulationIndex] == -1)
                    hitMonths[simulationIndex] = month;
            }
        }

        var successMonths = hitMonths
            .Where(month => month >= 0)
            .OrderBy(month => month)
            .ToArray();

        var probability = (double)successMonths.Length / SimulationCount;
        var medianMonths = GetQuantileMonth(successMonths, 0.50);
        var p25Months = GetQuantileMonth(successMonths, 0.25);
        var p75Months = GetQuantileMonth(successMonths, 0.75);

        var fullPercentilePaths = ComputePercentilePaths(allPaths, horizonMonths);
        var displayLen = ResolveDisplayLength(fullPercentilePaths, targetAmount, horizonMonths);
        displayLen = Math.Clamp(displayLen, 1, horizonMonths);

        var percentilePaths = TrimPercentilePaths(fullPercentilePaths, displayLen);
        var monthLabels = BuildMonthLabels(nowUtc, displayLen);

        return new GoalSimulationResultDto(
            probability,
            medianMonths,
            p25Months,
            p75Months,
            percentilePaths,
            resolvedParams,
            true,
            monthLabels);
    }

    private async Task<decimal> ResolveInitialCapitalAsync(CancellationToken ct)
    {
        var snapshots = await netWorthService.GetNetWorthTrendAsync(1, ct);
        return snapshots.LastOrDefault()?.NetWorth ?? 0m;
    }

    private async Task<ExpenseBootstrapPool> BuildBootstrapPoolAsync(string baseCurrencyCode, DateTime nowUtc,
        CancellationToken ct)
    {
        var fromUtc = nowUtc.AddDays(-AnalyticsCommon.AverageExpenseRollingWindowDays);
        var transactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc,
            nowUtc,
            excludeTransfers: true,
            type: TransactionType.Expense,
            ct: ct);

        var poolDays = Math.Max((int)(nowUtc - fromUtc).TotalDays + 1, 1);
        if (transactions.Count == 0)
            return new ExpenseBootstrapPool(new decimal[poolDays], 0);

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

        var pool = new decimal[poolDays];
        for (var dayIndex = 0; dayIndex < poolDays; dayIndex++)
        {
            var day = DateOnly.FromDateTime(fromUtc.AddDays(dayIndex));
            pool[dayIndex] = dailyTotals.GetValueOrDefault(day, 0m);
        }

        return new ExpenseBootstrapPool(pool, dailyTotals.Count);
    }

    private static decimal[] BuildExpensePool(decimal[] historicalPool, decimal targetDailyMean, int observedDays)
    {
        if (targetDailyMean <= 0m)
            return [0m];

        var alignedPool = AlignPoolToTargetMean(historicalPool, targetDailyMean);
        if (observedDays < MinHistoryDaysForVariance || HasLowVariance(alignedPool, targetDailyMean))
            return BuildSyntheticPool(targetDailyMean, Math.Max(SyntheticPoolSize, alignedPool.Length));

        return alignedPool;
    }

    private static decimal[] AlignPoolToTargetMean(decimal[] pool, decimal targetDailyMean)
    {
        if (pool.Length == 0)
            return [targetDailyMean];

        var mean = pool.Sum() / pool.Length;
        if (mean <= 0m)
            return pool.ToArray();

        var scale = targetDailyMean / mean;
        var aligned = new decimal[pool.Length];
        for (var i = 0; i < pool.Length; i++)
            aligned[i] = Math.Max(0m, pool[i] * scale);

        return aligned;
    }

    private static bool HasLowVariance(decimal[] pool, decimal mean)
    {
        if (pool.Length < 2 || mean <= 0m)
            return true;

        var variance = 0d;
        for (var i = 0; i < pool.Length; i++)
        {
            var delta = (double)(pool[i] - mean);
            variance += delta * delta;
        }

        variance /= pool.Length;
        var stdDev = (decimal)Math.Sqrt(variance);
        return stdDev <= mean * 0.03m;
    }

    private static decimal[] BuildSyntheticPool(decimal targetDailyMean, int size)
    {
        var poolSize = Math.Max(size, 30);
        var synthetic = new decimal[poolSize];
        var rng = new Random(137);

        for (var i = 0; i < poolSize; i++)
        {
            var randomShift = (decimal)(rng.NextDouble() * 2d - 1d);
            var factor = 1m + randomShift * SyntheticNoiseLevel;

            var dayOfWeek = i % 7;
            if (dayOfWeek is 5 or 6)
                factor += 0.04m;

            factor = Math.Clamp(factor, 0.55m, 1.55m);
            synthetic[i] = Math.Max(0m, targetDailyMean * factor);
        }

        return synthetic;
    }

    private static int EstimateHorizonMonths(
        decimal initialCapital,
        decimal targetAmount,
        decimal monthlyIncome,
        decimal monthlyExpenses,
        double monthlyReturn)
    {
        if (initialCapital >= targetAmount)
            return 1;

        var monthlySavings = monthlyIncome - monthlyExpenses;
        var capital = initialCapital;

        for (var month = 1; month <= MaxHorizonMonths; month++)
        {
            capital = capital * (1m + (decimal)monthlyReturn) + monthlySavings;
            if (capital >= targetAmount)
                return Math.Clamp(month + HorizonBufferMonths, MinHorizonMonths, MaxHorizonMonths);
        }

        return MaxHorizonMonths;
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

    private static GoalPercentilePathsDto ComputePercentilePaths(decimal[][] allPaths, int horizonMonths)
    {
        var p25 = new decimal[horizonMonths + 1];
        var p50 = new decimal[horizonMonths + 1];
        var p75 = new decimal[horizonMonths + 1];

        var pathCount = allPaths.Length;
        var sortBuffer = new decimal[pathCount];

        for (var month = 0; month <= horizonMonths; month++)
        {
            for (var simulationIndex = 0; simulationIndex < pathCount; simulationIndex++)
                sortBuffer[simulationIndex] = allPaths[simulationIndex][month];

            Array.Sort(sortBuffer);

            p25[month] = sortBuffer[(int)(pathCount * 0.25)];
            p50[month] = sortBuffer[pathCount / 2];
            p75[month] = sortBuffer[(int)(pathCount * 0.75)];
        }

        return new GoalPercentilePathsDto(p25, p50, p75);
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

    private static int GetQuantileMonth(int[] successMonths, double percentile)
    {
        if (successMonths.Length == 0)
            return -1;

        var index = (int)Math.Floor(successMonths.Length * percentile);
        index = Math.Clamp(index, 0, successMonths.Length - 1);
        return successMonths[index];
    }

    private static int ResolveDisplayLength(
        GoalPercentilePathsDto percentilePaths,
        decimal targetAmount,
        int fallbackHorizonMonths)
    {
        var conservativeHit = FindHitMonth(percentilePaths.P25, targetAmount);
        if (conservativeHit >= 0)
            return conservativeHit;

        var medianHit = FindHitMonth(percentilePaths.P50, targetAmount);
        if (medianHit >= 0)
            return medianHit;

        var optimisticHit = FindHitMonth(percentilePaths.P75, targetAmount);
        if (optimisticHit >= 0)
            return optimisticHit;

        return fallbackHorizonMonths;
    }

    private static int FindHitMonth(IReadOnlyList<decimal> path, decimal targetAmount)
    {
        for (var month = 0; month < path.Count; month++)
        {
            if (path[month] >= targetAmount)
                return month;
        }

        return -1;
    }

    private static GoalPercentilePathsDto TrimPercentilePaths(GoalPercentilePathsDto percentilePaths, int displayLen)
    {
        var visibleLength = displayLen + 1;
        return new GoalPercentilePathsDto(
            percentilePaths.P25.Take(visibleLength).ToArray(),
            percentilePaths.P50.Take(visibleLength).ToArray(),
            percentilePaths.P75.Take(visibleLength).ToArray());
    }

    private static GoalSimulationResultDto BuildUnachievableResult(GoalSimulationParametersDto resolvedParams)
    {
        var emptyPaths = new GoalPercentilePathsDto([], [], []);

        return new GoalSimulationResultDto(
            0,
            -1,
            -1,
            -1,
            emptyPaths,
            resolvedParams,
            false,
            []);
    }

    private sealed record ExpenseBootstrapPool(decimal[] Pool, int ObservedDays);
}
