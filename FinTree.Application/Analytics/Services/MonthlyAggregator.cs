using FinTree.Application.Analytics.Dto;
using FinTree.Application.Analytics.Shared;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Analytics.Services;

internal static class MonthlyAggregator
{
    internal record Result(
        decimal TotalIncome,
        decimal TotalExpenses,
        decimal PreviousMonthIncome,
        decimal PreviousMonthExpenses,
        decimal DiscretionaryTotal,
        decimal PreviousMonthDiscretionaryTotal,
        IReadOnlyDictionary<DateOnly, decimal> DailyTotals,
        IReadOnlyDictionary<DateOnly, decimal> PreviousMonthDailyTotals,
        IReadOnlyDictionary<Guid, CategoryTotals> ExpenseCategoryTotals,
        IReadOnlyDictionary<Guid, decimal> IncomeCategoryTotals);

    internal static Result Aggregate(
        IReadOnlyList<ConvertedTransactionSnapshot> transactions,
        DateTime monthStartUtc,
        DateTime monthEndUtc,
        DateTime previousMonthStartUtc,
        CancellationToken ct)
    {
        var dailyTotals = new Dictionary<DateOnly, decimal>();
        var previousMonthDailyTotals = new Dictionary<DateOnly, decimal>();
        var expenseCategoryTotals = new Dictionary<Guid, CategoryTotals>();
        var incomeCategoryTotals = new Dictionary<Guid, decimal>();

        var totalIncome = 0m;
        var totalExpenses = 0m;
        var previousMonthExpenses = 0m;
        var previousMonthIncome = 0m;
        var discretionaryTotal = 0m;
        var previousMonthDiscretionaryTotal = 0m;

        foreach (var txn in transactions)
        {
            ct.ThrowIfCancellationRequested();

            var amount = txn.AmountInBaseCurrency;
            var occurredUtc = txn.OccurredAtUtc;
            var isCurrentMonth = occurredUtc >= monthStartUtc && occurredUtc < monthEndUtc;
            var isPreviousMonth = occurredUtc >= previousMonthStartUtc && occurredUtc < monthStartUtc;

            var categoryKey = txn.CategoryId ?? Guid.Empty;

            if (txn.Type == TransactionType.Income)
            {
                if (isCurrentMonth)
                {
                    totalIncome += amount;
                    if (incomeCategoryTotals.TryGetValue(categoryKey, out var currentIncome))
                        incomeCategoryTotals[categoryKey] = currentIncome + amount;
                    else
                        incomeCategoryTotals[categoryKey] = amount;
                }

                if (isPreviousMonth)
                    previousMonthIncome += amount;

                continue;
            }

            if (isCurrentMonth)
            {
                totalExpenses += amount;
                var dateKey = DateOnly.FromDateTime(occurredUtc);

                if (dailyTotals.TryGetValue(dateKey, out var currentDaily))
                    dailyTotals[dateKey] = currentDaily + amount;
                else
                    dailyTotals[dateKey] = amount;

                if (expenseCategoryTotals.TryGetValue(categoryKey, out var categoryTotals))
                {
                    expenseCategoryTotals[categoryKey] = new CategoryTotals(
                        Total: categoryTotals.Total + amount,
                        MandatoryTotal: categoryTotals.MandatoryTotal + (txn.IsMandatory ? amount : 0m),
                        DiscretionaryTotal: categoryTotals.DiscretionaryTotal + (txn.IsMandatory ? 0m : amount));
                }
                else
                {
                    expenseCategoryTotals[categoryKey] = new CategoryTotals(
                        amount,
                        txn.IsMandatory ? amount : 0m,
                        txn.IsMandatory ? 0m : amount);
                }

                if (!txn.IsMandatory)
                    discretionaryTotal += amount;
            }

            if (isPreviousMonth)
            {
                previousMonthExpenses += amount;
                var previousDateKey = DateOnly.FromDateTime(occurredUtc);

                if (previousMonthDailyTotals.TryGetValue(previousDateKey, out var currentPreviousDaily))
                    previousMonthDailyTotals[previousDateKey] = currentPreviousDaily + amount;
                else
                    previousMonthDailyTotals[previousDateKey] = amount;

                if (!txn.IsMandatory)
                    previousMonthDiscretionaryTotal += amount;
            }
        }

        return new Result(
            TotalIncome: totalIncome,
            TotalExpenses: totalExpenses,
            PreviousMonthIncome: previousMonthIncome,
            PreviousMonthExpenses: previousMonthExpenses,
            DiscretionaryTotal: discretionaryTotal,
            PreviousMonthDiscretionaryTotal: previousMonthDiscretionaryTotal,
            DailyTotals: dailyTotals,
            PreviousMonthDailyTotals: previousMonthDailyTotals,
            ExpenseCategoryTotals: expenseCategoryTotals,
            IncomeCategoryTotals: incomeCategoryTotals);
    }
}
