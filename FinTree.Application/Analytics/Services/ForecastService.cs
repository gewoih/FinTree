using FinTree.Application.Analytics.Dto;
using FinTree.Application.Analytics.Shared;
using FinTree.Application.Goals.Services;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Analytics.Services;

public class ForecastService(
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter,
    CashflowAverageService cashflowAverageService)
{
    private const int BootstrapingSimulationsCount = 10_000;

    public async Task<ForecastDto> BuildForecastAsync(int year, int month, Dictionary<DateOnly, decimal> dailyTotals,
        string baseCurrencyCode, CancellationToken ct)
    {
        var nowUtc = DateTime.UtcNow;
        var monthStartUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEndUtc = monthStartUtc.AddMonths(1);
        var isCurrentMonth = monthStartUtc.Year == nowUtc.Year && monthStartUtc.Month == nowUtc.Month;
        var lastDate = isCurrentMonth ? nowUtc.Date : monthEndUtc.AddDays(-1).Date;

        var forecastStart = lastDate.AddDays(-GoalSimulationDefaults.HistoryWindowDays);

        var forecastTransactions = await transactionsService.GetTransactionSnapshotsAsync(forecastStart, lastDate,
            excludeTransfers: true, excludeInvestmentAccounts: true,
            type: TransactionType.Expense, ct: ct);

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            forecastTransactions.Select(txn => (txn.Money.CurrencyCode, txn.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var forecastDailyTotals = new Dictionary<DateOnly, decimal>();
        foreach (var txn in forecastTransactions)
        {
            var rateKey = (txn.Money.CurrencyCode, txn.OccurredAtUtc.Date);
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
        var poolEnd = isCurrentMonth ? lastDate.AddDays(-1) : lastDate;
        var poolDays = Math.Clamp((int)(poolEnd - forecastStart).TotalDays + 1, 0, GoalSimulationDefaults.HistoryWindowDays);

        var pool = new decimal[poolDays];
        for (var i = 0; i < poolDays; i++)
        {
            var dateKey = DateOnly.FromDateTime(forecastStart.AddDays(i));
            pool[i] = forecastDailyTotals.GetValueOrDefault(dateKey, 0m);
        }

        var daysInMonth = DateTime.DaysInMonth(year, month);
        var observedDays = isCurrentMonth
            ? Math.Min(nowUtc.Day, daysInMonth)
            : daysInMonth;

        decimal observedCumulativeActual;
        {
            var runningTotal = 0m;
            for (var day = 1; day <= observedDays; day++)
            {
                var dateKey = new DateOnly(year, month, day);
                runningTotal += dailyTotals.GetValueOrDefault(dateKey, 0m);
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
            var winsorizedPool = BootstrapSamplerService.Winsorize(
                pool,
                GoalSimulationDefaults.ExpenseWinsorizeLowerQuantile,
                GoalSimulationDefaults.ExpenseWinsorizeUpperQuantile);

            var simTotals = new decimal[BootstrapingSimulationsCount];
            var seedParts = new List<long>
            {
                year,
                month,
                observedDays,
                remainingDays,
                BootstrapSamplerService.ToCents(observedCumulativeActual)
            };

            seedParts.AddRange(pool.Select(BootstrapSamplerService.ToCents));
            var seed = BootstrapSamplerService.BuildDeterministicSeed(
                GoalSimulationDefaults.ForecastDeterministicSeedBase,
                seedParts);

            var blockStartCount = BootstrapSamplerService.GetBlockStartCount(
                winsorizedPool.Length,
                GoalSimulationDefaults.BootstrapBlockDays);
            var cdf = BootstrapSamplerService.BuildRecencyCdf(blockStartCount, GoalSimulationDefaults.ForecastRecencyLambda);
            var rng = new Random(seed);

            for (var s = 0; s < BootstrapingSimulationsCount; s++)
            {
                var total = observedCumulativeActual;
                var r = 0;
                while (r < remainingDays)
                {
                    var blockStart = BootstrapSamplerService.SampleBlockStartIndex(
                        winsorizedPool.Length, cdf, GoalSimulationDefaults.BootstrapBlockDays, rng);
                    for (var b = 0; b < GoalSimulationDefaults.BootstrapBlockDays && r < remainingDays; b++, r++)
                        total += winsorizedPool[Math.Min(blockStart + b, winsorizedPool.Length - 1)];
                }

                simTotals[s] = total;
            }

            Array.Sort(simTotals);
            optimisticTotal = simTotals[3_500]; // P35
            riskTotal = simTotals[8_500]; // P85

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
            var dayAmount = dailyTotals.GetValueOrDefault(dateKey, 0m);
            cumulative += dayAmount;
            if (day <= observedDays)
                observedCumulative = cumulative;

            if (isCurrentMonth && day > observedDays)
                actual.Add(null);
            else
                actual.Add(MathService.Round2(cumulative));

            optimistic.Add(BuildForecastScenarioPoint(
                optimisticDaily,
                isCurrentMonth,
                day,
                observedDays,
                cumulative,
                observedCumulative));

            risk.Add(BuildForecastScenarioPoint(riskDaily, isCurrentMonth, day, observedDays, cumulative,
                observedCumulative));
        }

        var currentSpent = isCurrentMonth
            ? observedCumulativeActual
            : cumulative;

        var baselineDailyRate =
            await cashflowAverageService.GetAverageDailyExpenseAsync(baseCurrencyCode, nowUtc, ct);

        var baselineLimit = baselineDailyRate > 0m
            ? baselineDailyRate * GoalSimulationDefaults.AverageDaysInMonth
            : (decimal?)null;

        var summary = new ForecastSummaryDto(optimisticTotal, riskTotal, currentSpent, baselineLimit);
        var series = new ForecastSeriesDto(days, actual, optimistic, risk, baselineLimit);
        return new ForecastDto(summary, series);
    }

    private static decimal? BuildForecastScenarioPoint(decimal? projectedDaily, bool isCurrentMonth, int day,
        int observedDays, decimal cumulativeActual, decimal observedCumulativeActual)
    {
        if (!projectedDaily.HasValue)
            return null;

        if (!isCurrentMonth)
            return projectedDaily.Value * day;

        return day <= observedDays
            ? cumulativeActual
            : observedCumulativeActual + projectedDaily.Value * (day - observedDays);
    }
}
