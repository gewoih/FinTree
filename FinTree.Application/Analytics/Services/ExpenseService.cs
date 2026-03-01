using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Analytics.Services;

public sealed class ExpenseService(TransactionsService transactionsService, CurrencyConverter currencyConverter)
{
    public async Task<decimal> GetAverageDailyExpenseAsync(string baseCurrencyCode, DateTime fromUtc, DateTime toUtc,
        CancellationToken ct)
    {
        var earliestTrackedAtUtc = await transactionsService.GetEarliestOccurredAtBeforeAsync(toUtc,true, ct);
        if (!earliestTrackedAtUtc.HasValue)
            return 0m;

        var rawExpenses = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: fromUtc,
            toUtc: toUtc,
            excludeTransfers: true,
            type: TransactionType.Expense,
            ct: ct);

        if (rawExpenses.Count == 0)
            return 0m;

        var transactions = rawExpenses.Select(expense => (expense.Money.CurrencyCode, expense.OccurredAtUtc));
        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(transactions, baseCurrencyCode, ct);

        var dailyTotals = new Dictionary<DateTime, decimal>();

        foreach (var expense in rawExpenses)
        {
            var rateKey = (expense.Money.CurrencyCode, expense.OccurredAtUtc.Date);

            var amountInBaseCurrency = expense.Money.Amount * rateByCurrencyAndDay[rateKey];
            var date = expense.OccurredAtUtc;

            if (dailyTotals.TryGetValue(date, out var current))
                dailyTotals[date] = current + amountInBaseCurrency;
            else
                dailyTotals[date] = amountInBaseCurrency;
        }

        return ComputeAverageDailyExpense(dailyTotals, earliestTrackedAtUtc, fromUtc, toUtc);
    }

    public static decimal ComputeAverageDailyExpense(IReadOnlyDictionary<DateTime, decimal> expenseDailyTotals,
        DateTime? earliestTrackedAtUtc, DateTime fromUtc, DateTime toUtc)
    {
        if (!earliestTrackedAtUtc.HasValue || earliestTrackedAtUtc.Value >= toUtc)
            return 0m;

        var totalExpense = expenseDailyTotals
            .Where(entry => entry.Key >= fromUtc && entry.Key < toUtc)
            .Sum(entry => entry.Value);

        var effectiveStartUtc = earliestTrackedAtUtc.Value > fromUtc
            ? earliestTrackedAtUtc.Value
            : fromUtc;

        var calendarDays = (decimal)(toUtc - effectiveStartUtc).TotalDays;

        if (calendarDays <= 0m)
            return 0m;

        return totalExpense / calendarDays;
    }
}