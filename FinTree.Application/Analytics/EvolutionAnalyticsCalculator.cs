using FinTree.Application.Accounts;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Application.Users;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Analytics;

internal sealed class EvolutionAnalyticsCalculator(
    AccountsService accountsService,
    TransactionsService transactionsService,
    UserService userService,
    CurrencyConverter currencyConverter,
    IPeakMetricsService peakMetricsService,
    ILiquidityMonthsService liquidityMonthsService,
    ITotalMonthScoreService totalMonthScoreService)
    : IEvolutionAnalyticsCalculator
{
    public async Task<List<EvolutionMonthDto>> GetEvolutionAsync(int months, CancellationToken ct)
    {
        var baseCurrencyCode = await userService.GetCurrentUserBaseCurrencyCodeAsync(ct);
        var baseCurrencyCodeNormalized = AnalyticsNormalization.NormalizeCurrencyCode(baseCurrencyCode);

        var now = DateTime.UtcNow;
        var windowMonths = months > 0 ? months : 120;
        var windowStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
            .AddMonths(-(windowMonths - 1));
        var liquidityWindowStart = windowStart.AddDays(-180);

        var accountSnapshots = await accountsService.GetAccountSnapshotsAsync(includeArchived: false, ct);
        var accountIds = accountSnapshots
            .Select(a => a.Id)
            .ToArray();
        var accountCreatedAtById = accountSnapshots
            .ToDictionary(a => a.Id, a => a.CreatedAtUtc);
        var liquidAccounts = accountSnapshots
            .Where(a => a.IsLiquid)
            .ToList();

        var adjustmentSnapshots = await accountsService.GetAccountAdjustmentSnapshotsAsync(accountIds, ct: ct);

        var transactionSnapshots = await transactionsService.GetTransactionSnapshotsAsync(ct: ct);

        var windowTransactions = transactionSnapshots
            .Where(t => !t.IsTransfer && t.OccurredAtUtc >= windowStart)
            .ToList();
        var liquidityExpenseTransactions = transactionSnapshots
            .Where(t => !t.IsTransfer &&
                        t.Type == TransactionType.Expense &&
                        t.OccurredAtUtc >= liquidityWindowStart)
            .ToList();
        var earliestTrackedAtUtc = transactionSnapshots
            .Where(t => !t.IsTransfer)
            .Select(t => (DateTime?)t.OccurredAtUtc)
            .Min();

        var monthStartsWithData = windowTransactions
            .Select(t => new DateTime(t.OccurredAtUtc.Year, t.OccurredAtUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc))
            .ToHashSet();

        var distinctAccountCurrencies = accountSnapshots
            .Select(a => AnalyticsNormalization.NormalizeCurrencyCode(a.CurrencyCode))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var fxRateRequests = new HashSet<(string CurrencyCode, DateTime DayStartUtc)>();
        foreach (var txn in windowTransactions)
            fxRateRequests.Add((AnalyticsNormalization.NormalizeCurrencyCode(txn.Money.CurrencyCode), txn.OccurredAtUtc.Date));
        foreach (var txn in liquidityExpenseTransactions)
            fxRateRequests.Add((AnalyticsNormalization.NormalizeCurrencyCode(txn.Money.CurrencyCode), txn.OccurredAtUtc.Date));

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

        var eventsByAccount = AnalyticsBalanceTimeline.BuildBalanceEventsByAccount(
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

        AnalyticsBalanceTimeline.AdvanceBalancesToBoundary(
            windowStart,
            accountIds,
            eventsByAccount,
            balancesByAccount,
            eventIndexByAccount,
            ct);

        decimal ConvertAmount(string currencyCode, decimal amount, DateTime occurredAtUtc)
        {
            var normalizedCurrencyCode = AnalyticsNormalization.NormalizeCurrencyCode(currencyCode);
            if (string.Equals(normalizedCurrencyCode, baseCurrencyCodeNormalized, StringComparison.OrdinalIgnoreCase))
                return amount;

            var rateKey = (normalizedCurrencyCode, occurredAtUtc.Date);
            return rateByCurrencyAndDay.TryGetValue(rateKey, out var rate)
                ? amount * rate
                : amount;
        }

        decimal ConvertAmountWithRate(string currencyCode, decimal amount, DateTime occurredAtUtc)
        {
            var normalizedCurrencyCode = AnalyticsNormalization.NormalizeCurrencyCode(currencyCode);
            if (string.Equals(normalizedCurrencyCode, baseCurrencyCodeNormalized, StringComparison.OrdinalIgnoreCase))
                return amount;

            var rate = rateByCurrencyAndDay[(normalizedCurrencyCode, occurredAtUtc.Date)];
            return amount * rate;
        }

        var liquidityExpenseDailyTotals = liquidityExpenseTransactions
            .GroupBy(transaction => DateOnly.FromDateTime(transaction.OccurredAtUtc))
            .ToDictionary(
                group => group.Key,
                group => group.Sum(transaction =>
                    ConvertAmount(transaction.Money.CurrencyCode, transaction.Money.Amount, transaction.OccurredAtUtc)));

        var result = new List<EvolutionMonthDto>(windowMonths);

        for (var i = 0; i < windowMonths; i++)
        {
            var monthStart = windowStart.AddMonths(i);
            var monthEnd = monthStart.AddMonths(1);
            if (monthStart > now)
                break;

            AnalyticsBalanceTimeline.AdvanceBalancesToBoundary(
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
                    null, null, null, null, null, null, null, null, null, null, null, null));
                continue;
            }

            var monthIncome = monthIncomeTransactions.Sum(t =>
                ConvertAmount(t.Money.CurrencyCode, t.Money.Amount, t.OccurredAtUtc));

            var dailyTotals = monthExpenses
                .GroupBy(t => DateOnly.FromDateTime(t.OccurredAtUtc))
                .ToDictionary(
                    g => g.Key,
                    g => g.Sum(t => ConvertAmount(t.Money.CurrencyCode, t.Money.Amount, t.OccurredAtUtc)));

            var dailyDiscretionary = monthExpenses
                .Where(t => !t.IsMandatory)
                .GroupBy(t => DateOnly.FromDateTime(t.OccurredAtUtc))
                .ToDictionary(
                    g => g.Key,
                    g => g.Sum(t => ConvertAmount(t.Money.CurrencyCode, t.Money.Amount, t.OccurredAtUtc)));

            var monthTotal = dailyTotals.Values.Sum();
            var discretionaryTotal = dailyDiscretionary.Values.Sum();
            var observedDays = dailyTotals.Count;

            var meanDaily = observedDays > 0 ? AnalyticsMath.Round2(monthTotal / observedDays) : 0m;
            var rawSavingsRate = monthIncome > 0
                ? (monthIncome - monthTotal) / monthIncome
                : (decimal?)null;
            var savingsRate = rawSavingsRate.HasValue
                ? AnalyticsMath.Round2(rawSavingsRate.Value)
                : (decimal?)null;
            var rawDiscretionaryPercent = monthTotal > 0
                ? (discretionaryTotal / monthTotal) * 100m
                : (decimal?)null;
            var discretionaryPercent = rawDiscretionaryPercent.HasValue
                ? AnalyticsMath.Round2(rawDiscretionaryPercent.Value)
                : (decimal?)null;

            var stabilityIndexValue = AnalyticsMath.ComputeStabilityIndex(dailyTotals.Values.ToList());
            var stabilityIndex = stabilityIndexValue.HasValue
                ? AnalyticsMath.Round2(stabilityIndexValue.Value)
                : (decimal?)null;
            var stabilityStatus = AnalyticsMath.ResolveStabilityStatus(stabilityIndex);
            var stabilityActionCode = AnalyticsMath.ResolveStabilityActionCode(stabilityStatus);
            var stabilityScore = AnalyticsMath.ComputeStabilityScore(stabilityIndex);

            var daysInMonth = DateTime.DaysInMonth(monthStart.Year, monthStart.Month);
            var peakMetrics = peakMetricsService.Calculate(dailyDiscretionary, monthTotal, daysInMonth);
            var peakDayRatio = peakMetrics.PeakDayRatioPercent;
            var peakSpendSharePercent = peakMetrics.PeakSpendSharePercent;

            var rateAtUtc = monthEnd.AddTicks(-1);
            var netWorth = accountSnapshots.Sum(account =>
                ConvertAmountWithRate(account.CurrencyCode, balancesByAccount[account.Id], rateAtUtc));
            netWorth = AnalyticsMath.Round2(netWorth);

            var liquidAssets = liquidAccounts.Sum(account =>
                ConvertAmountWithRate(account.CurrencyCode, balancesByAccount[account.Id], rateAtUtc));
            liquidAssets = AnalyticsMath.Round2(liquidAssets);

            var averageDailyExpense = liquidityMonthsService.ComputeAverageDailyExpense(
                liquidityExpenseDailyTotals,
                earliestTrackedAtUtc,
                monthEnd);
            var liquidMonths = liquidityMonthsService.ComputeLiquidMonths(liquidAssets, averageDailyExpense);
            var totalMonthScore = totalMonthScoreService.CalculateTotalMonthScore(
                rawSavingsRate,
                liquidMonths,
                stabilityScore,
                rawDiscretionaryPercent,
                peakSpendSharePercent);

            result.Add(new EvolutionMonthDto(
                monthStart.Year,
                monthStart.Month,
                true,
                savingsRate,
                stabilityIndex,
                stabilityScore,
                stabilityStatus,
                stabilityActionCode,
                discretionaryPercent,
                netWorth,
                liquidMonths,
                meanDaily,
                peakDayRatio,
                peakSpendSharePercent,
                totalMonthScore));
        }

        return result;
    }
}
