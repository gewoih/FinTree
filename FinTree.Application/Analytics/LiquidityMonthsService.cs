using FinTree.Application.Accounts;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;

namespace FinTree.Application.Analytics;

internal interface ILiquidityMonthsService
{
    Task<decimal> GetLiquidAssetsAtAsync(string baseCurrencyCode, DateTime atUtc, CancellationToken ct);

    Task<decimal> GetAverageDailyExpenseAsync(string baseCurrencyCode, DateTime windowEndUtc, CancellationToken ct);

    decimal ComputeAverageDailyExpense(
        IReadOnlyDictionary<DateOnly, decimal> expenseDailyTotals,
        DateTime? earliestTrackedAtUtc,
        DateTime windowEndUtc);

    decimal ComputeLiquidMonths(decimal liquidAssets, decimal averageDailyExpense);
}

internal sealed class LiquidityMonthsService(
    AccountsService accountsService,
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter)
    : ILiquidityMonthsService
{
    public async Task<decimal> GetLiquidAssetsAtAsync(string baseCurrencyCode, DateTime atUtc, CancellationToken ct)
    {
        var liquidAccounts = (await accountsService.GetAccountSnapshotsAsync(includeArchived: false, ct))
            .Where(account => account.IsLiquid)
            .ToList();

        if (liquidAccounts.Count == 0)
            return 0m;

        var accountIds = liquidAccounts
            .Select(account => account.Id)
            .ToList();

        var rawAdjustments = await accountsService.GetAccountAdjustmentSnapshotsAsync(accountIds, beforeUtc: atUtc, ct: ct);

        var rawTransactions = await transactionsService.GetTransactionSnapshotsAsync(
            toUtc: atUtc,
            accountIds: accountIds,
            ct: ct);

        var adjustmentsByAccount = rawAdjustments
            .GroupBy(adjustment => adjustment.AccountId)
            .ToDictionary(
                group => group.Key,
                group => group.OrderBy(adjustment => adjustment.OccurredAtUtc).ToList());

        var transactionsByAccount = rawTransactions
            .GroupBy(transaction => transaction.AccountId)
            .ToDictionary(
                group => group.Key,
                group => group
                    .Select(transaction => new
                    {
                        Delta = transaction.Type == TransactionType.Income
                            ? transaction.Money.Amount
                            : -transaction.Money.Amount,
                        transaction.OccurredAtUtc,
                    })
                    .OrderBy(transaction => transaction.OccurredAtUtc)
                    .ToList());

        var rateAtUtc = atUtc.AddTicks(-1);
        var rateByCurrency = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

        foreach (var currency in liquidAccounts.Select(account => account.CurrencyCode).Distinct(StringComparer.OrdinalIgnoreCase))
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
                    .Where(transaction => !anchorAt.HasValue || transaction.OccurredAtUtc > anchorAt.Value)
                    .Sum(transaction => transaction.Delta);

                balance += delta;
            }

            var rate = rateByCurrency.TryGetValue(account.CurrencyCode, out var foundRate) ? foundRate : 1m;
            total += balance * rate;
        }

        return AnalyticsMath.Round2(total);
    }

    public async Task<decimal> GetAverageDailyExpenseAsync(string baseCurrencyCode, DateTime windowEndUtc, CancellationToken ct)
    {
        var windowStartUtc = windowEndUtc.AddDays(-180);

        var earliestTrackedAtUtc = await transactionsService.GetEarliestOccurredAtBeforeAsync(
            windowEndUtc,
            excludeTransfers: true,
            ct);

        if (!earliestTrackedAtUtc.HasValue)
            return 0m;

        var rawExpenses = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: windowStartUtc,
            toUtc: windowEndUtc,
            excludeTransfers: true,
            type: TransactionType.Expense,
            ct: ct);

        if (rawExpenses.Count == 0)
            return 0m;

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            rawExpenses.Select(expense => (expense.Money.CurrencyCode, expense.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var dailyTotals = new Dictionary<DateOnly, decimal>();

        foreach (var expense in rawExpenses)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (
                AnalyticsNormalization.NormalizeCurrencyCode(expense.Money.CurrencyCode),
                expense.OccurredAtUtc.Date);

            var amountInBaseCurrency = expense.Money.Amount * rateByCurrencyAndDay[rateKey];
            var dayKey = DateOnly.FromDateTime(expense.OccurredAtUtc);

            if (dailyTotals.TryGetValue(dayKey, out var current))
                dailyTotals[dayKey] = current + amountInBaseCurrency;
            else
                dailyTotals[dayKey] = amountInBaseCurrency;
        }

        return ComputeAverageDailyExpense(dailyTotals, earliestTrackedAtUtc, windowEndUtc);
    }

    public decimal ComputeAverageDailyExpense(
        IReadOnlyDictionary<DateOnly, decimal> expenseDailyTotals,
        DateTime? earliestTrackedAtUtc,
        DateTime windowEndUtc)
    {
        if (!earliestTrackedAtUtc.HasValue || earliestTrackedAtUtc.Value >= windowEndUtc)
            return 0m;

        var windowStartUtc = windowEndUtc.AddDays(-180);
        var windowStartDate = DateOnly.FromDateTime(windowStartUtc);
        var windowEndDate = DateOnly.FromDateTime(windowEndUtc);

        var totalExpense = expenseDailyTotals
            .Where(entry => entry.Key >= windowStartDate && entry.Key < windowEndDate)
            .Sum(entry => entry.Value);

        var effectiveStartUtc = earliestTrackedAtUtc.Value > windowStartUtc
            ? earliestTrackedAtUtc.Value
            : windowStartUtc;

        var calendarDays = (decimal)(windowEndUtc - effectiveStartUtc).TotalDays;

        if (calendarDays <= 0m)
            return 0m;

        return totalExpense / calendarDays;
    }

    public decimal ComputeLiquidMonths(decimal liquidAssets, decimal averageDailyExpense)
    {
        var monthlyExpense = averageDailyExpense * 30.44m;

        if (monthlyExpense <= 0m)
            return 0m;

        return Math.Round(liquidAssets / monthlyExpense, 2, MidpointRounding.AwayFromZero);
    }
}
