using FinTree.Application.Analytics.Dto;
using FinTree.Application.Transactions;
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
        IReadOnlyDictionary<DateOnly, decimal> DailyTotals,
        IReadOnlyDictionary<DateOnly, decimal> DailyTotalsDiscretionary,
        IReadOnlyDictionary<Guid, CategoryTotals> ExpenseCategoryTotals,
        IReadOnlyDictionary<Guid, decimal> IncomeCategoryTotals,
        IReadOnlyDictionary<Guid, decimal> PriorExpenseCategoryTotals,
        IReadOnlySet<(int Year, int Month)> PriorMonthsWithData);

    internal static Result Aggregate(
        IReadOnlyList<TransactionAnalyticsSnapshot> transactions,
        IReadOnlyDictionary<(string CurrencyCode, DateTime Date), decimal> rates,
        DateTime monthStartUtc,
        DateTime monthEndUtc,
        DateTime previousMonthStartUtc,
        DateTime deltaWindowStartUtc,
        CancellationToken ct)
    {
        var dailyTotals = new Dictionary<DateOnly, decimal>();
        var dailyTotalsDiscretionary = new Dictionary<DateOnly, decimal>();
        var expenseCategoryTotals = new Dictionary<Guid, CategoryTotals>();
        var incomeCategoryTotals = new Dictionary<Guid, decimal>();
        var priorExpenseCategoryTotals = new Dictionary<Guid, decimal>();
        var priorMonthsWithData = new HashSet<(int Year, int Month)>();

        var totalIncome = 0m;
        var totalExpenses = 0m;
        var previousMonthExpenses = 0m;
        var previousMonthIncome = 0m;
        var discretionaryTotal = 0m;

        foreach (var txn in transactions)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (txn.Money.CurrencyCode, txn.OccurredAtUtc.Date);
            var amount = txn.Money.Amount * rates[rateKey];
            var occurredUtc = txn.OccurredAtUtc;
            var isCurrentMonth = occurredUtc >= monthStartUtc && occurredUtc < monthEndUtc;
            var isPreviousMonth = occurredUtc >= previousMonthStartUtc && occurredUtc < monthStartUtc;

            if (txn.Type == TransactionType.Income)
            {
                if (isCurrentMonth)
                {
                    totalIncome += amount;
                    if (incomeCategoryTotals.TryGetValue(txn.CategoryId, out var currentIncome))
                        incomeCategoryTotals[txn.CategoryId] = currentIncome + amount;
                    else
                        incomeCategoryTotals[txn.CategoryId] = amount;
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

                if (!txn.IsMandatory)
                {
                    if (dailyTotalsDiscretionary.TryGetValue(dateKey, out var currentDisc))
                        dailyTotalsDiscretionary[dateKey] = currentDisc + amount;
                    else
                        dailyTotalsDiscretionary[dateKey] = amount;
                }

                if (expenseCategoryTotals.TryGetValue(txn.CategoryId, out var categoryTotals))
                {
                    expenseCategoryTotals[txn.CategoryId] = new CategoryTotals(
                        Total: categoryTotals.Total + amount,
                        MandatoryTotal: categoryTotals.MandatoryTotal + (txn.IsMandatory ? amount : 0m),
                        DiscretionaryTotal: categoryTotals.DiscretionaryTotal + (txn.IsMandatory ? 0m : amount));
                }
                else
                {
                    expenseCategoryTotals[txn.CategoryId] = new CategoryTotals(
                        amount,
                        txn.IsMandatory ? amount : 0m,
                        txn.IsMandatory ? 0m : amount);
                }

                if (!txn.IsMandatory)
                    discretionaryTotal += amount;
            }

            if (occurredUtc >= deltaWindowStartUtc && occurredUtc < monthStartUtc)
            {
                if (priorExpenseCategoryTotals.TryGetValue(txn.CategoryId, out var priorTotal))
                    priorExpenseCategoryTotals[txn.CategoryId] = priorTotal + amount;
                else
                    priorExpenseCategoryTotals[txn.CategoryId] = amount;

                priorMonthsWithData.Add((occurredUtc.Year, occurredUtc.Month));
            }

            if (isPreviousMonth)
                previousMonthExpenses += amount;
        }

        return new Result(
            TotalIncome: totalIncome,
            TotalExpenses: totalExpenses,
            PreviousMonthIncome: previousMonthIncome,
            PreviousMonthExpenses: previousMonthExpenses,
            DiscretionaryTotal: discretionaryTotal,
            DailyTotals: dailyTotals,
            DailyTotalsDiscretionary: dailyTotalsDiscretionary,
            ExpenseCategoryTotals: expenseCategoryTotals,
            IncomeCategoryTotals: incomeCategoryTotals,
            PriorExpenseCategoryTotals: priorExpenseCategoryTotals,
            PriorMonthsWithData: priorMonthsWithData);
    }
}
