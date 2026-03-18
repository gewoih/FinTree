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
        decimal PreviousMonthDiscretionaryTotal,
        IReadOnlyDictionary<DateOnly, decimal> DailyTotals,
        IReadOnlyDictionary<DateOnly, decimal> DailyTotalsDiscretionary,
        IReadOnlyDictionary<DateOnly, decimal> PreviousMonthDailyTotals,
        IReadOnlyDictionary<DateOnly, decimal> PreviousMonthDailyTotalsDiscretionary,
        IReadOnlyDictionary<Guid, CategoryTotals> ExpenseCategoryTotals,
        IReadOnlyDictionary<Guid, decimal> IncomeCategoryTotals,
        IReadOnlyDictionary<(int Year, int Month), IReadOnlyDictionary<Guid, decimal>> PriorExpenseCategoryTotalsByMonth,
        IReadOnlyDictionary<(int Year, int Month), int> PriorExpenseDaysByMonth);

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
        var previousMonthDailyTotals = new Dictionary<DateOnly, decimal>();
        var previousMonthDailyTotalsDiscretionary = new Dictionary<DateOnly, decimal>();
        var expenseCategoryTotals = new Dictionary<Guid, CategoryTotals>();
        var incomeCategoryTotals = new Dictionary<Guid, decimal>();
        var priorExpenseCategoryTotalsByMonth = new Dictionary<(int Year, int Month), Dictionary<Guid, decimal>>();
        var priorExpenseDaysByMonth = new Dictionary<(int Year, int Month), HashSet<DateOnly>>();

        var totalIncome = 0m;
        var totalExpenses = 0m;
        var previousMonthExpenses = 0m;
        var previousMonthIncome = 0m;
        var discretionaryTotal = 0m;
        var previousMonthDiscretionaryTotal = 0m;

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
                var monthKey = (occurredUtc.Year, occurredUtc.Month);
                var dateKey = DateOnly.FromDateTime(occurredUtc);

                if (!priorExpenseCategoryTotalsByMonth.TryGetValue(monthKey, out var monthCategoryTotals))
                {
                    monthCategoryTotals = new Dictionary<Guid, decimal>();
                    priorExpenseCategoryTotalsByMonth[monthKey] = monthCategoryTotals;
                }
                if (monthCategoryTotals.TryGetValue(txn.CategoryId, out var priorTotal))
                    monthCategoryTotals[txn.CategoryId] = priorTotal + amount;
                else
                    monthCategoryTotals[txn.CategoryId] = amount;

                if (!priorExpenseDaysByMonth.TryGetValue(monthKey, out var days))
                {
                    days = new HashSet<DateOnly>();
                    priorExpenseDaysByMonth[monthKey] = days;
                }
                days.Add(dateKey);
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
                {
                    if (previousMonthDailyTotalsDiscretionary.TryGetValue(previousDateKey, out var currentPreviousDisc))
                        previousMonthDailyTotalsDiscretionary[previousDateKey] = currentPreviousDisc + amount;
                    else
                        previousMonthDailyTotalsDiscretionary[previousDateKey] = amount;

                    previousMonthDiscretionaryTotal += amount;
                }
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
            DailyTotalsDiscretionary: dailyTotalsDiscretionary,
            PreviousMonthDailyTotals: previousMonthDailyTotals,
            PreviousMonthDailyTotalsDiscretionary: previousMonthDailyTotalsDiscretionary,
            ExpenseCategoryTotals: expenseCategoryTotals,
            IncomeCategoryTotals: incomeCategoryTotals,
            PriorExpenseCategoryTotalsByMonth: priorExpenseCategoryTotalsByMonth
                .ToDictionary(kv => kv.Key, kv => (IReadOnlyDictionary<Guid, decimal>)kv.Value),
            PriorExpenseDaysByMonth: priorExpenseDaysByMonth
                .ToDictionary(kv => kv.Key, kv => kv.Value.Count));
    }
}
