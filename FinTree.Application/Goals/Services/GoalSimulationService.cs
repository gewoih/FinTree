using FinTree.Application.Analytics.Services;
using FinTree.Application.Goals.Dto;
using FinTree.Application.Users;

namespace FinTree.Application.Goals.Services;

public sealed class GoalSimulationService(
    CashflowAverageService cashflowAverageService,
    NetWorthService netWorthService,
    UserService userService,
    BootstrapSamplerService bootstrapSamplerService)
{
    public async Task<GoalSimulationParametersDto> GetDefaultParametersAsync(CancellationToken ct)
    {
        var nowUtc = DateTime.UtcNow;
        var baseCurrencyCode = await userService.GetCurrentUserBaseCurrencyCodeAsync(ct);
        var profile = await cashflowAverageService.BuildSimulationProfileAsync(baseCurrencyCode, nowUtc, ct);
        var initialCapital = await ResolveInitialCapitalAsync(ct);

        return new GoalSimulationParametersDto(
            initialCapital,
            profile.MonthlyIncomeAverage,
            profile.MonthlyExpenseAverage,
            0m,
            true,
            true,
            true);
    }

    public async Task<GoalSimulationResultDto> SimulateAsync(
        GoalSimulationRequestDto request,
        CancellationToken ct)
    {
        if (request.TargetAmount <= 0m)
            throw new ArgumentOutOfRangeException(nameof(request.TargetAmount), "TargetAmount must be greater than zero.");

        var nowUtc = DateTime.UtcNow;
        var simulationStartDate = DateOnly.FromDateTime(nowUtc.Date);
        var baseCurrencyCode = await userService.GetCurrentUserBaseCurrencyCodeAsync(ct);

        var profile = await cashflowAverageService.BuildSimulationProfileAsync(baseCurrencyCode, nowUtc, ct);

        var capitalFromAnalytics = !request.InitialCapital.HasValue;
        var initialCapital = request.InitialCapital ?? await ResolveInitialCapitalAsync(ct);

        var incomeFromAnalytics = !request.MonthlyIncome.HasValue;
        var monthlyIncome = request.MonthlyIncome ?? profile.MonthlyIncomeAverage;

        var expensesFromAnalytics = !request.MonthlyExpenses.HasValue;
        var monthlyExpenses = request.MonthlyExpenses ?? profile.MonthlyExpenseAverage;

        var annualReturnRate = request.AnnualReturnRate ?? 0m;
        var targetAmount = request.TargetAmount;
        var dataQualityScore = ComputeDataQualityScore(profile.ObservedCalendarDays);

        var resolvedParams = new GoalSimulationParametersDto(
            initialCapital,
            monthlyIncome,
            monthlyExpenses,
            annualReturnRate,
            capitalFromAnalytics,
            incomeFromAnalytics,
            expensesFromAnalytics);

        var avgMonthlySavings = monthlyIncome - monthlyExpenses;
        var canGrowFromReturns = annualReturnRate > 0m && initialCapital > 0m;
        var isAchievable = initialCapital >= targetAmount || avgMonthlySavings > 0m || canGrowFromReturns;

        if (!isAchievable)
            return BuildUnachievableResult(resolvedParams, dataQualityScore);

        var targetDailyIncome = monthlyIncome / GoalSimulationDefaults.AverageDaysInMonth;
        var incomePool = BuildIncomePool(profile.DailyIncomeSeries, targetDailyIncome);
        var incomeStartCount = GetBlockStartCount(incomePool.Count, GoalSimulationDefaults.BootstrapBlockDays);
        var incomeCdf = bootstrapSamplerService.BuildRecencyCdf(
            incomeStartCount,
            GoalSimulationDefaults.GoalRecencyLambda);
        var expectedDailyIncomeFromSampling = ComputeExpectedBlockDailyAmount(
            incomePool,
            incomeCdf,
            GoalSimulationDefaults.BootstrapBlockDays);
        var incomeDriftAdjustment = targetDailyIncome - expectedDailyIncomeFromSampling;

        var targetDailyExpense = monthlyExpenses / GoalSimulationDefaults.AverageDaysInMonth;
        var expensePool = BuildExpensePool(profile.DailyExpenseSeries, targetDailyExpense);
        var expenseStartCount = GetBlockStartCount(expensePool.Count, GoalSimulationDefaults.BootstrapBlockDays);
        var expenseCdf = bootstrapSamplerService.BuildRecencyCdf(
            expenseStartCount,
            GoalSimulationDefaults.GoalRecencyLambda);
        var expectedDailyExpenseFromSampling = ComputeExpectedBlockDailyAmount(
            expensePool,
            expenseCdf,
            GoalSimulationDefaults.BootstrapBlockDays);
        var expenseDriftAdjustment = targetDailyExpense - expectedDailyExpenseFromSampling;

        var meanDailyReturn = AnnualToDailyReturn(annualReturnRate);
        var dailyReturnVolatility = ResolveDailyReturnVolatility(annualReturnRate);

        var horizonDays = GoalSimulationDefaults.MaxHorizonYears * GoalSimulationDefaults.DaysInYear;

        var horizonMonths = GoalSimulationDefaults.MaxHorizonYears * 12;
        var monthOffsets = BuildMonthOffsets(simulationStartDate, horizonMonths, horizonDays);

        var seedParts = new List<long>
        {
            BootstrapSamplerService.ToCents(targetAmount),
            BootstrapSamplerService.ToCents(initialCapital),
            BootstrapSamplerService.ToCents(monthlyIncome),
            BootstrapSamplerService.ToCents(monthlyExpenses),
            BootstrapSamplerService.ToCents(annualReturnRate),
            profile.ObservedCalendarDays,
            incomeStartCount,
            expenseStartCount,
            horizonDays
        };

        var seedPoolHalf = Math.Max(1, GoalSimulationDefaults.SeedPoolSamples / 2);
        seedParts.AddRange(incomePool
            .Take(seedPoolHalf)
            .Select(BootstrapSamplerService.ToCents));
        seedParts.AddRange(expensePool
            .Take(seedPoolHalf)
            .Select(BootstrapSamplerService.ToCents));
        var seed = bootstrapSamplerService.BuildDeterministicSeed(GoalSimulationDefaults.GoalDeterministicSeedBase, seedParts);

        var incomePoolDouble = incomePool.Select(value => (double)value).ToArray();
        var expensePoolDouble = expensePool.Select(value => (double)value).ToArray();

        var monthlyPaths = new double[GoalSimulationDefaults.MaxSimulations][];
        var hitDays = new int[GoalSimulationDefaults.MaxSimulations];
        Array.Fill(hitDays, -1);

        var totalSimulations = 0;
        var stableIterations = 0;
        double? previousProbability = null;
        int? previousMedianHitDay = null;
        var parallelOptions = new ParallelOptions
        {
            CancellationToken = ct
        };

        while (totalSimulations < GoalSimulationDefaults.MaxSimulations)
        {
            var batchSize = Math.Min(GoalSimulationDefaults.BatchSize, GoalSimulationDefaults.MaxSimulations - totalSimulations);
            var batchStartIndex = totalSimulations;

            Parallel.For(0, batchSize, parallelOptions, index =>
            {
                var simulationIndex = batchStartIndex + index;
                var simulationSeed = HashCode.Combine(seed, simulationIndex);
                var rng = new Random(simulationSeed);

                var simulationResult = SimulateSinglePath(
                    (double)initialCapital,
                    (double)targetAmount,
                    horizonDays,
                    monthOffsets,
                    incomePoolDouble,
                    incomeCdf,
                    (double)incomeDriftAdjustment,
                    expensePoolDouble,
                    expenseCdf,
                    (double)expenseDriftAdjustment,
                    meanDailyReturn,
                    dailyReturnVolatility,
                    rng);

                monthlyPaths[simulationIndex] = simulationResult.MonthlyPath;
                hitDays[simulationIndex] = simulationResult.HitDay;
            });

            totalSimulations += batchSize;
            if (totalSimulations < GoalSimulationDefaults.MinSimulations)
                continue;

            var checkpointSuccessDays = BuildSortedSuccessDays(hitDays, totalSimulations);
            var checkpointProbability = checkpointSuccessDays.Length / (double)totalSimulations;

            var checkpointMedianDay = GetQuantileValue(checkpointSuccessDays, GoalSimulationDefaults.QuantileP50);

            if (previousProbability.HasValue && previousMedianHitDay.HasValue)
            {
                var probabilityDelta = Math.Abs(checkpointProbability - previousProbability.Value);
                var medianDelta = Math.Abs(checkpointMedianDay - previousMedianHitDay.Value);

                if (probabilityDelta < GoalSimulationDefaults.ConvergenceProbDelta
                    && medianDelta <= GoalSimulationDefaults.ConvergenceMedianDeltaDays)
                {
                    stableIterations++;
                }
                else
                {
                    stableIterations = 0;
                }

                if (stableIterations >= GoalSimulationDefaults.ConvergenceStableBatches)
                    break;
            }

            previousProbability = checkpointProbability;
            previousMedianHitDay = checkpointMedianDay;
        }

        var successDays = BuildSortedSuccessDays(hitDays, totalSimulations);

        var rawProbability = successDays.Length / (double)totalSimulations;
        var probability = Math.Clamp(rawProbability, 0d, 1d);

        var fullPercentilePaths = ComputePercentilePaths(monthlyPaths, totalSimulations, horizonMonths);
        var medianHitMonth = FindHitMonth(fullPercentilePaths.P50, targetAmount);
        var p25HitMonth = FindHitMonth(fullPercentilePaths.P25, targetAmount);
        var p75HitMonth = FindHitMonth(fullPercentilePaths.P75, targetAmount);

        var displayMonths = ResolveDisplayMonths(fullPercentilePaths, targetAmount, horizonMonths);
        displayMonths = Math.Clamp(displayMonths, 1, horizonMonths);

        var percentilePaths = TrimPercentilePaths(fullPercentilePaths, displayMonths);
        var monthLabels = BuildMonthLabels(simulationStartDate, displayMonths);

        return new GoalSimulationResultDto(
            probability,
            dataQualityScore,
            medianHitMonth,
            p25HitMonth,
            p75HitMonth,
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

    private static IReadOnlyList<decimal> BuildExpensePool(IReadOnlyList<decimal> sourceDailyExpenseSeries,
        decimal targetDailyMean)
    {
        return BuildCashflowPool(
            sourceDailyExpenseSeries,
            targetDailyMean,
            GoalSimulationDefaults.ExpenseWinsorizeLowerQuantile,
            GoalSimulationDefaults.ExpenseWinsorizeUpperQuantile,
            GoalSimulationDefaults.ExpenseMinRelativeStdDevForHistoryPool,
            BuildSyntheticExpensePool);
    }

    private static IReadOnlyList<decimal> BuildIncomePool(IReadOnlyList<decimal> sourceDailyIncomeSeries,
        decimal targetDailyMean)
    {
        return BuildCashflowPool(
            sourceDailyIncomeSeries,
            targetDailyMean,
            GoalSimulationDefaults.IncomeWinsorizeLowerQuantile,
            GoalSimulationDefaults.IncomeWinsorizeUpperQuantile,
            GoalSimulationDefaults.IncomeMinRelativeStdDevForHistoryPool,
            BuildSyntheticIncomePool);
    }

    private static IReadOnlyList<decimal> BuildCashflowPool(
        IReadOnlyList<decimal> sourceDailySeries,
        decimal targetDailyMean,
        double winsorizeLowerQuantile,
        double winsorizeUpperQuantile,
        decimal minRelativeStdDevForHistoryPool,
        Func<decimal, IReadOnlyList<decimal>> syntheticPoolFactory)
    {
        if (targetDailyMean <= 0m)
            return [0m];

        if (sourceDailySeries.Count == 0)
            return syntheticPoolFactory(targetDailyMean);

        var alignedPool = AlignPoolToTargetMean(sourceDailySeries, targetDailyMean);
        var winsorizedPool = Winsorize(
            alignedPool,
            winsorizeLowerQuantile,
            winsorizeUpperQuantile);

        if (HasLowVariance(winsorizedPool, targetDailyMean, minRelativeStdDevForHistoryPool))
            return syntheticPoolFactory(targetDailyMean);

        return winsorizedPool;
    }

    private static decimal[] AlignPoolToTargetMean(IReadOnlyList<decimal> pool, decimal targetMean)
    {
        if (pool.Count == 0)
            return [targetMean];

        var sourceMean = pool.Sum() / pool.Count;
        if (sourceMean <= 0m)
            return pool.Select(value => Math.Max(0m, value)).ToArray();

        var scale = targetMean / sourceMean;
        var aligned = new decimal[pool.Count];

        for (var index = 0; index < pool.Count; index++)
            aligned[index] = Math.Max(0m, pool[index] * scale);

        return aligned;
    }

    private static decimal[] Winsorize(IReadOnlyList<decimal> values, double lowerQuantile, double upperQuantile)
    {
        if (values.Count == 0)
            return [];

        var sorted = values.ToArray();
        Array.Sort(sorted);

        var lowerIndex = (int)Math.Floor((sorted.Length - 1) * lowerQuantile);
        var upperIndex = (int)Math.Ceiling((sorted.Length - 1) * upperQuantile);

        lowerIndex = Math.Clamp(lowerIndex, 0, sorted.Length - 1);
        upperIndex = Math.Clamp(upperIndex, lowerIndex, sorted.Length - 1);

        var lower = sorted[lowerIndex];
        var upper = sorted[upperIndex];

        var winsorized = new decimal[values.Count];
        for (var index = 0; index < values.Count; index++)
            winsorized[index] = Math.Clamp(values[index], lower, upper);

        return winsorized;
    }

    private static bool HasLowVariance(
        IReadOnlyList<decimal> pool,
        decimal mean,
        decimal minRelativeStdDevForHistoryPool)
    {
        if (pool.Count < 4 || mean <= 0m)
            return true;

        var variance = 0d;
        for (var index = 0; index < pool.Count; index++)
        {
            var delta = (double)(pool[index] - mean);
            variance += delta * delta;
        }

        variance /= pool.Count;
        var stdDev = (decimal)Math.Sqrt(variance);
        return stdDev <= mean * minRelativeStdDevForHistoryPool;
    }

    private static IReadOnlyList<decimal> BuildSyntheticExpensePool(decimal targetDailyMean)
    {
        var pool = new decimal[GoalSimulationDefaults.SyntheticExpensePoolSize];
        var rng = new Random(GoalSimulationDefaults.SyntheticSeedBase + (int)Math.Round(targetDailyMean));

        for (var index = 0; index < pool.Length; index++)
        {
            var randomShift = (decimal)(rng.NextDouble() * 2d - 1d);
            var factor = 1m + randomShift * GoalSimulationDefaults.SyntheticExpenseNoiseLevel;

            if (index % GoalSimulationDefaults.SyntheticWeekLengthDays
                is GoalSimulationDefaults.SyntheticWeekendStartIndex
                or GoalSimulationDefaults.SyntheticWeekendEndIndex)
                factor += GoalSimulationDefaults.SyntheticWeekendExpenseBoost;

            factor = Math.Clamp(
                factor,
                GoalSimulationDefaults.SyntheticExpenseFactorMin,
                GoalSimulationDefaults.SyntheticExpenseFactorMax);
            pool[index] = Math.Max(0m, targetDailyMean * factor);
        }

        return pool;
    }

    private static IReadOnlyList<decimal> BuildSyntheticIncomePool(decimal targetDailyMean)
    {
        var pool = new decimal[GoalSimulationDefaults.SyntheticExpensePoolSize];
        var rng = new Random(
            GoalSimulationDefaults.SyntheticSeedBase
            + GoalSimulationDefaults.SyntheticIncomeSeedOffset
            + (int)Math.Round(targetDailyMean));

        for (var index = 0; index < pool.Length; index++)
        {
            var randomShift = (decimal)(rng.NextDouble() * 2d - 1d);
            var factor = 1m + randomShift * GoalSimulationDefaults.SyntheticIncomeNoiseLevel;
            factor = Math.Clamp(
                factor,
                GoalSimulationDefaults.SyntheticIncomeFactorMin,
                GoalSimulationDefaults.SyntheticIncomeFactorMax);
            pool[index] = Math.Max(0m, targetDailyMean * factor);
        }

        return pool;
    }

    private static double AnnualToDailyReturn(decimal annualReturnRate)
    {
        var annualRate = (double)annualReturnRate;
        if (annualRate <= GoalSimulationDefaults.AnnualReturnFloorForDailyConversion)
            annualRate = GoalSimulationDefaults.AnnualReturnFloorForDailyConversion;

        return Math.Pow(1d + annualRate, 1d / GoalSimulationDefaults.DaysInYear) - 1d;
    }

    private static double ResolveDailyReturnVolatility(decimal annualReturnRate)
    {
        var annualVolatility = GoalSimulationDefaults.AnnualVolatilityBase
            + Math.Abs((double)annualReturnRate) * GoalSimulationDefaults.AnnualVolatilityReturnSensitivity;
        annualVolatility = Math.Clamp(annualVolatility,
            GoalSimulationDefaults.AnnualVolatilityFloor,
            GoalSimulationDefaults.AnnualVolatilityCap);

        return annualVolatility / Math.Sqrt(GoalSimulationDefaults.DaysInYear);
    }

    private static int GetBlockStartCount(int poolCount, int blockDays)
    {
        if (poolCount <= 0 || blockDays <= 0)
            return 0;

        return Math.Max(1, poolCount - blockDays + 1);
    }

    private static decimal ComputeExpectedBlockDailyAmount(
        IReadOnlyList<decimal> pool,
        double[] startCdf,
        int blockDays)
    {
        if (pool.Count == 0 || blockDays <= 0)
            return 0m;

        var maxStartIndex = Math.Max(pool.Count - blockDays, 0);
        var startCount = maxStartIndex + 1;
        if (startCount <= 0)
            return 0m;

        var expected = 0m;
        var useCdf = startCdf.Length == startCount && startCdf.Length > 0;
        var uniformWeight = 1d / startCount;

        for (var startIndex = 0; startIndex <= maxStartIndex; startIndex++)
        {
            var startWeight = useCdf
                ? CdfMassAt(startCdf, startIndex)
                : uniformWeight;
            if (startWeight <= 0d)
                continue;

            var blockSum = 0m;
            for (var day = 0; day < blockDays; day++)
            {
                var poolIndex = Math.Min(startIndex + day, pool.Count - 1);
                blockSum += pool[poolIndex];
            }

            var blockMean = blockSum / blockDays;
            expected += blockMean * (decimal)startWeight;
        }

        return expected;
    }

    private static double CdfMassAt(IReadOnlyList<double> cdf, int index)
    {
        if (index < 0 || index >= cdf.Count)
            return 0d;

        var previous = index == 0 ? 0d : cdf[index - 1];
        return Math.Max(0d, cdf[index] - previous);
    }

    private static int[] BuildMonthOffsets(DateOnly startDate, int horizonMonths, int horizonDays)
    {
        var offsets = new int[horizonMonths + 1];

        for (var month = 0; month <= horizonMonths; month++)
        {
            var monthDate = startDate.AddMonths(month);
            var dayOffset = monthDate.DayNumber - startDate.DayNumber;
            offsets[month] = Math.Clamp(dayOffset, 0, horizonDays);
        }

        return offsets;
    }

    private SimulationPathResult SimulateSinglePath(
        double initialCapital,
        double targetAmount,
        int horizonDays,
        int[] monthOffsets,
        double[] incomePool,
        double[] incomeCdf,
        double incomeDriftAdjustment,
        double[] expensePool,
        double[] expenseCdf,
        double expenseDriftAdjustment,
        double meanDailyReturn,
        double dailyReturnVolatility,
        Random rng)
    {
        var monthlyPath = new double[monthOffsets.Length];
        monthlyPath[0] = initialCapital;

        var capital = initialCapital;
        var hitDay = initialCapital >= targetAmount ? 0 : -1;

        var nextMonthIndex = 1;
        var nextMonthOffset = nextMonthIndex < monthOffsets.Length ? monthOffsets[nextMonthIndex] : int.MaxValue;
        var incomeBlockStartIndex = 0;
        var expenseBlockStartIndex = 0;

        for (var day = 1; day <= horizonDays; day++)
        {
            if ((day - 1) % GoalSimulationDefaults.BootstrapBlockDays == 0)
            {
                incomeBlockStartIndex = SampleBlockStartIndex(
                    incomePool.Length,
                    incomeCdf,
                    GoalSimulationDefaults.BootstrapBlockDays,
                    rng);

                expenseBlockStartIndex = SampleBlockStartIndex(
                    expensePool.Length,
                    expenseCdf,
                    GoalSimulationDefaults.BootstrapBlockDays,
                    rng);
            }

            var blockIndex = (day - 1) % GoalSimulationDefaults.BootstrapBlockDays;
            var incomeIndex = Math.Min(incomeBlockStartIndex + blockIndex, incomePool.Length - 1);
            var expenseIndex = Math.Min(expenseBlockStartIndex + blockIndex, expensePool.Length - 1);
            var dailyIncome = Math.Max(0d, incomePool[incomeIndex] + incomeDriftAdjustment);
            var dailyExpense = Math.Max(0d, expensePool[expenseIndex] + expenseDriftAdjustment);

            var dailyReturn = meanDailyReturn + dailyReturnVolatility * NextStandardNormal(rng);
            dailyReturn = Math.Max(GoalSimulationDefaults.DailyReturnFloor, dailyReturn);

            capital = capital * (1d + dailyReturn) + (dailyIncome - dailyExpense);

            if (hitDay == -1 && capital >= targetAmount)
                hitDay = day;

            while (day >= nextMonthOffset && nextMonthIndex < monthOffsets.Length)
            {
                monthlyPath[nextMonthIndex] = capital;
                nextMonthIndex++;
                nextMonthOffset = nextMonthIndex < monthOffsets.Length ? monthOffsets[nextMonthIndex] : int.MaxValue;
            }
        }

        while (nextMonthIndex < monthOffsets.Length)
        {
            monthlyPath[nextMonthIndex] = capital;
            nextMonthIndex++;
        }

        return new SimulationPathResult(monthlyPath, hitDay);
    }

    private static double NextStandardNormal(Random rng)
    {
        var u1 = 1d - rng.NextDouble();
        var u2 = 1d - rng.NextDouble();

        return Math.Sqrt(-2d * Math.Log(u1)) * Math.Sin(2d * Math.PI * u2);
    }

    private static int SampleBlockStartIndex(int poolLength, double[] cdf, int blockDays, Random rng)
    {
        if (poolLength <= 0)
            return 0;

        var maxStartIndex = Math.Max(poolLength - blockDays, 0);
        var startCount = maxStartIndex + 1;

        var randomValue = rng.NextDouble();
        var startIndex = cdf.Length == startCount
            ? Array.BinarySearch(cdf, randomValue)
            : (int)Math.Floor(randomValue * startCount);

        if (startIndex < 0)
            startIndex = ~startIndex;

        return Math.Clamp(startIndex, 0, maxStartIndex);
    }

    private static int[] BuildSortedSuccessDays(int[] hitDays, int count)
    {
        var successCount = 0;
        for (var index = 0; index < count; index++)
        {
            if (hitDays[index] >= 0)
                successCount++;
        }

        if (successCount == 0)
            return [];

        var successDays = new int[successCount];
        var writeIndex = 0;
        for (var index = 0; index < count; index++)
        {
            if (hitDays[index] < 0)
                continue;

            successDays[writeIndex] = hitDays[index];
            writeIndex++;
        }

        Array.Sort(successDays);
        return successDays;
    }

    private static double ComputeDataQualityScore(int observedHistoryDays)
    {
        if (observedHistoryDays <= 0)
            return GoalSimulationDefaults.QualityFactorMin;

        var progress = Math.Clamp(observedHistoryDays / (double)GoalSimulationDefaults.QualityFactorFullHistoryDays, 0d, 1d);
        return GoalSimulationDefaults.QualityFactorMin + (1d - GoalSimulationDefaults.QualityFactorMin) * progress;
    }

    private static GoalPercentilePathsDto ComputePercentilePaths(double[][] paths, int pathCount, int horizonMonths)
    {
        if (pathCount <= 0)
            return new GoalPercentilePathsDto([], [], []);

        var p25 = new decimal[horizonMonths + 1];
        var p50 = new decimal[horizonMonths + 1];
        var p75 = new decimal[horizonMonths + 1];

        var sortBuffer = new double[pathCount];
        var p25Index = (int)Math.Floor((pathCount - 1) * GoalSimulationDefaults.QuantileP25);
        var p50Index = (int)Math.Floor((pathCount - 1) * GoalSimulationDefaults.QuantileP50);
        var p75Index = (int)Math.Floor((pathCount - 1) * GoalSimulationDefaults.QuantileP75);

        for (var month = 0; month <= horizonMonths; month++)
        {
            for (var simulationIndex = 0; simulationIndex < pathCount; simulationIndex++)
                sortBuffer[simulationIndex] = paths[simulationIndex][month];

            p25[month] = (decimal)QuickSelect(sortBuffer, p25Index);
            p50[month] = (decimal)QuickSelect(sortBuffer, p50Index);
            p75[month] = (decimal)QuickSelect(sortBuffer, p75Index);
        }

        return new GoalPercentilePathsDto(p25, p50, p75);
    }

    private static double QuickSelect(double[] values, int targetIndex)
    {
        if (values.Length == 0)
            return 0d;

        var left = 0;
        var right = values.Length - 1;
        targetIndex = Math.Clamp(targetIndex, 0, values.Length - 1);

        while (left < right)
        {
            var pivotIndex = Partition(values, left, right);

            if (pivotIndex == targetIndex)
                return values[pivotIndex];

            if (targetIndex < pivotIndex)
                right = pivotIndex - 1;
            else
                left = pivotIndex + 1;
        }

        return values[left];
    }

    private static int Partition(double[] values, int left, int right)
    {
        var pivotIndex = left + ((right - left) / 2);
        var pivotValue = values[pivotIndex];
        Swap(values, pivotIndex, right);

        var storeIndex = left;
        for (var index = left; index < right; index++)
        {
            if (values[index] <= pivotValue)
            {
                Swap(values, storeIndex, index);
                storeIndex++;
            }
        }

        Swap(values, storeIndex, right);
        return storeIndex;
    }

    private static void Swap(double[] values, int left, int right)
    {
        if (left == right)
            return;

        (values[left], values[right]) = (values[right], values[left]);
    }

    private static int ResolveDisplayMonths(GoalPercentilePathsDto percentilePaths, decimal targetAmount,
        int fallbackHorizonMonths)
    {
        var conservativeHitMonth = FindHitMonth(percentilePaths.P25, targetAmount);
        if (conservativeHitMonth >= 0)
            return conservativeHitMonth;

        var medianHitMonth = FindHitMonth(percentilePaths.P50, targetAmount);
        if (medianHitMonth >= 0)
            return medianHitMonth;

        var optimisticHitMonth = FindHitMonth(percentilePaths.P75, targetAmount);
        if (optimisticHitMonth >= 0)
            return optimisticHitMonth;

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

    private static GoalPercentilePathsDto TrimPercentilePaths(GoalPercentilePathsDto percentilePaths, int displayMonths)
    {
        var visibleLength = displayMonths + 1;
        return new GoalPercentilePathsDto(
            percentilePaths.P25.Take(visibleLength).ToArray(),
            percentilePaths.P50.Take(visibleLength).ToArray(),
            percentilePaths.P75.Take(visibleLength).ToArray());
    }

    private static IReadOnlyList<string> BuildMonthLabels(DateOnly simulationStartDate, int count)
    {
        var labels = new string[count + 1];

        for (var month = 0; month <= count; month++)
        {
            var date = simulationStartDate.AddMonths(month).ToDateTime(TimeOnly.MinValue);
            labels[month] = $"{date:MMM yyyy}";
        }

        return labels;
    }

    private static int GetQuantileValue(int[] sortedValues, double percentile)
    {
        if (sortedValues.Length == 0)
            return -1;

        var index = (int)Math.Floor((sortedValues.Length - 1) * percentile);
        index = Math.Clamp(index, 0, sortedValues.Length - 1);
        return sortedValues[index];
    }

    private static GoalSimulationResultDto BuildUnachievableResult(
        GoalSimulationParametersDto resolvedParams,
        double dataQualityScore)
    {
        var emptyPaths = new GoalPercentilePathsDto([], [], []);

        return new GoalSimulationResultDto(
            0,
            dataQualityScore,
            -1,
            -1,
            -1,
            emptyPaths,
            resolvedParams,
            false,
            []);
    }

    private readonly record struct SimulationPathResult(double[] MonthlyPath, int HitDay);
}
