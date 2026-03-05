using FinTree.Application.Analytics.Shared;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Analytics.Services;

public sealed class CashflowAverageService(TransactionsService transactionsService, CurrencyConverter currencyConverter)
{
    public Task<decimal> GetAverageDailyExpenseAsync(string baseCurrencyCode, DateTime atUtc, CancellationToken ct)
        => GetAverageDailyAmountAsync(baseCurrencyCode, atUtc, TransactionType.Expense, ct);

    public Task<decimal> GetAverageDailyIncomeAsync(string baseCurrencyCode, DateTime atUtc, CancellationToken ct)
        => GetAverageDailyAmountAsync(baseCurrencyCode, atUtc, TransactionType.Income, ct);

    public async Task<decimal> GetAverageMonthlyExpenseAsync(string baseCurrencyCode, DateTime atUtc,
        CancellationToken ct)
    {
        var averageDailyExpense = await GetAverageDailyExpenseAsync(baseCurrencyCode, atUtc, ct);
        return averageDailyExpense * (decimal)AnalyticsCommon.AverageDaysInMonth;
    }

    public async Task<decimal> GetAverageMonthlyIncomeAsync(string baseCurrencyCode, DateTime atUtc,
        CancellationToken ct)
    {
        var averageDailyIncome = await GetAverageDailyIncomeAsync(baseCurrencyCode, atUtc, ct);
        return averageDailyIncome * (decimal)AnalyticsCommon.AverageDaysInMonth;
    }

    private async Task<decimal> GetAverageDailyAmountAsync(
        string baseCurrencyCode,
        DateTime atUtc,
        TransactionType type,
        CancellationToken ct)
    {
        var earliestTrackedAtUtc = await transactionsService.GetEarliestOccurredAtBeforeAsync(
            beforeUtc: atUtc,
            excludeTransfers: true,
            type: type,
            ct: ct);

        if (!earliestTrackedAtUtc.HasValue)
            return 0m;

        var fromUtc = atUtc.AddDays(-AnalyticsCommon.AverageExpenseRollingWindowDays);
        var transactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: fromUtc,
            toUtc: atUtc,
            excludeTransfers: true,
            type: type,
            ct: ct);

        if (transactions.Count == 0)
            return 0m;

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            transactions.Select(transaction => (transaction.Money.CurrencyCode, transaction.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var dailyTotals = new Dictionary<DateOnly, decimal>();

        foreach (var transaction in transactions)
        {
            var rateKey = (transaction.Money.CurrencyCode, transaction.OccurredAtUtc.Date);
            var amountInBaseCurrency = transaction.Money.Amount * rateByCurrencyAndDay[rateKey];
            var day = DateOnly.FromDateTime(transaction.OccurredAtUtc);

            if (dailyTotals.TryGetValue(day, out var current))
                dailyTotals[day] = current + amountInBaseCurrency;
            else
                dailyTotals[day] = amountInBaseCurrency;
        }

        return ComputeAverageDailyAmount(dailyTotals, earliestTrackedAtUtc, fromUtc, atUtc);
    }

    private static decimal ComputeAverageDailyAmount(IReadOnlyDictionary<DateOnly, decimal> dailyTotals,
        DateTime? earliestTrackedAtUtc, DateTime fromUtc, DateTime toUtc)
    {
        if (!earliestTrackedAtUtc.HasValue || earliestTrackedAtUtc.Value >= toUtc)
            return 0m;

        var totalAmount = dailyTotals.Sum(entry => entry.Value);

        var effectiveStartUtc = earliestTrackedAtUtc.Value > fromUtc
            ? earliestTrackedAtUtc.Value
            : fromUtc;

        var calendarDays = (decimal)(toUtc - effectiveStartUtc).TotalDays;

        if (calendarDays <= 0m)
            return 0m;

        return totalAmount / calendarDays;
    }
}
