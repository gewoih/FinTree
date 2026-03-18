using FinTree.Application.Currencies;
using FinTree.Application.Goals.Services;
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
        return averageDailyExpense * GoalSimulationDefaults.AverageDaysInMonth;
    }

    public async Task<decimal> GetAverageMonthlyIncomeAsync(string baseCurrencyCode, DateTime atUtc,
        CancellationToken ct)
    {
        var averageDailyIncome = await GetAverageDailyIncomeAsync(baseCurrencyCode, atUtc, ct);
        return averageDailyIncome * GoalSimulationDefaults.AverageDaysInMonth;
    }

    public async Task<CashflowSimulationProfile> BuildSimulationProfileAsync(
        string baseCurrencyCode,
        DateTime atUtc,
        CancellationToken ct)
    {
        var profileToUtc = DateTime.SpecifyKind(atUtc.Date, DateTimeKind.Utc);
        if (profileToUtc >= atUtc)
            profileToUtc = atUtc;

        var simulationWindowDays = Math.Max(
            GoalSimulationDefaults.HistoryWindowDays,
            GoalSimulationDefaults.QualityFactorFullHistoryDays);

        var selectedWindow = await LoadSeriesWindowAsync(
            baseCurrencyCode,
            profileToUtc,
            simulationWindowDays,
            ct);

        if (selectedWindow.CalendarDays <= 0)
            return new CashflowSimulationProfile(0m, 0m, [], [], 0);

        var totalIncome = selectedWindow.DailyIncomeSeries.Sum();
        var totalExpense = selectedWindow.DailyExpenseSeries.Sum();

        var averageDailyIncome = totalIncome / selectedWindow.CalendarDays;
        var averageDailyExpense = totalExpense / selectedWindow.CalendarDays;

        var monthlyIncomeAverage = averageDailyIncome * GoalSimulationDefaults.AverageDaysInMonth;
        var monthlyExpenseAverage = averageDailyExpense * GoalSimulationDefaults.AverageDaysInMonth;

        return new CashflowSimulationProfile(
            monthlyIncomeAverage,
            monthlyExpenseAverage,
            selectedWindow.DailyIncomeSeries,
            selectedWindow.DailyExpenseSeries,
            selectedWindow.CalendarDays);
    }

    private async Task<CashflowSeriesWindow> LoadSeriesWindowAsync(
        string baseCurrencyCode,
        DateTime toUtc,
        int windowDays,
        CancellationToken ct)
    {
        var earliestIncome = await transactionsService.GetEarliestOccurredAtBeforeAsync(
            beforeUtc: toUtc,
            excludeTransfers: true,
            excludeInvestmentAccounts: true,
            type: TransactionType.Income,
            ct: ct);

        var earliestExpense = await transactionsService.GetEarliestOccurredAtBeforeAsync(
            beforeUtc: toUtc,
            excludeTransfers: true,
            excludeInvestmentAccounts: true,
            type: TransactionType.Expense,
            ct: ct);

        DateTime? earliestTrackedAtUtc = null;
        if (earliestIncome.HasValue && earliestExpense.HasValue)
            earliestTrackedAtUtc = earliestIncome < earliestExpense ? earliestIncome : earliestExpense;
        else if (earliestIncome.HasValue)
            earliestTrackedAtUtc = earliestIncome;
        else if (earliestExpense.HasValue)
            earliestTrackedAtUtc = earliestExpense;

        if (!earliestTrackedAtUtc.HasValue)
            return new CashflowSeriesWindow([], [], 0);

        var fromUtc = toUtc.AddDays(-windowDays);

        var incomeTransactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: fromUtc,
            toUtc: toUtc,
            excludeTransfers: true,
            excludeInvestmentAccounts: true,
            type: TransactionType.Income,
            ct: ct);

        var expenseTransactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: fromUtc,
            toUtc: toUtc,
            excludeTransfers: true,
            excludeInvestmentAccounts: true,
            type: TransactionType.Expense,
            ct: ct);

        if (incomeTransactions.Count == 0 && expenseTransactions.Count == 0)
            return new CashflowSeriesWindow([], [], 0);

        var allTransactions = incomeTransactions
            .Concat(expenseTransactions)
            .ToList();

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            allTransactions.Select(transaction => (transaction.Money.CurrencyCode, transaction.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var incomeDailyTotals = AggregateDailyTotals(incomeTransactions, rateByCurrencyAndDay);
        var expenseDailyTotals = AggregateDailyTotals(expenseTransactions, rateByCurrencyAndDay);

        var effectiveStartUtc = earliestTrackedAtUtc.Value > fromUtc
            ? earliestTrackedAtUtc.Value
            : fromUtc;

        var startDate = DateOnly.FromDateTime(effectiveStartUtc.Date);
        var endDate = DateOnly.FromDateTime(toUtc.Date.AddDays(-1));

        if (endDate < startDate)
            return new CashflowSeriesWindow([], [], 0);

        var days = endDate.DayNumber - startDate.DayNumber + 1;
        if (days <= 0)
            return new CashflowSeriesWindow([], [], 0);

        var incomeSeries = BuildDenseDailySeries(incomeDailyTotals, startDate, days);
        var expenseSeries = BuildDenseDailySeries(expenseDailyTotals, startDate, days);

        return new CashflowSeriesWindow(incomeSeries, expenseSeries, days);
    }

    private static Dictionary<DateOnly, decimal> AggregateDailyTotals(
        IEnumerable<TransactionAnalyticsSnapshot> transactions,
        IReadOnlyDictionary<(string CurrencyCode, DateTime Day), decimal> rateByCurrencyAndDay)
    {
        var dailyTotals = new Dictionary<DateOnly, decimal>();

        foreach (var transaction in transactions)
        {
            var rateKey = (transaction.Money.CurrencyCode, transaction.OccurredAtUtc.Date);
            if (!rateByCurrencyAndDay.TryGetValue(rateKey, out var rate))
                throw new InvalidOperationException(
                    $"Курс валюты {transaction.Money.CurrencyCode} на {transaction.OccurredAtUtc:yyyy-MM-dd} не найден в предзагруженных данных.");
            var amountInBaseCurrency = transaction.Money.Amount * rate;
            var day = DateOnly.FromDateTime(transaction.OccurredAtUtc);

            if (dailyTotals.TryGetValue(day, out var current))
                dailyTotals[day] = current + amountInBaseCurrency;
            else
                dailyTotals[day] = amountInBaseCurrency;
        }

        return dailyTotals;
    }

    private static IReadOnlyList<decimal> BuildDenseDailySeries(
        IReadOnlyDictionary<DateOnly, decimal> dailyTotals,
        DateOnly startDate,
        int days)
    {
        var series = new decimal[days];

        for (var index = 0; index < days; index++)
        {
            var date = startDate.AddDays(index);
            series[index] = dailyTotals.GetValueOrDefault(date, 0m);
        }

        return series;
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
            excludeInvestmentAccounts: true,
            type: type,
            ct: ct);

        if (!earliestTrackedAtUtc.HasValue)
            return 0m;

        var fromUtc = atUtc.AddDays(-GoalSimulationDefaults.HistoryWindowDays);
        var transactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: fromUtc,
            toUtc: atUtc,
            excludeTransfers: true,
            excludeInvestmentAccounts: true,
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
            if (!rateByCurrencyAndDay.TryGetValue(rateKey, out var rate))
                throw new InvalidOperationException(
                    $"Курс валюты {transaction.Money.CurrencyCode} на {transaction.OccurredAtUtc:yyyy-MM-dd} не найден в предзагруженных данных.");
            var amountInBaseCurrency = transaction.Money.Amount * rate;
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

    private sealed record CashflowSeriesWindow(
        IReadOnlyList<decimal> DailyIncomeSeries,
        IReadOnlyList<decimal> DailyExpenseSeries,
        int CalendarDays);
}

public sealed record CashflowSimulationProfile(
    decimal MonthlyIncomeAverage,
    decimal MonthlyExpenseAverage,
    IReadOnlyList<decimal> DailyIncomeSeries,
    IReadOnlyList<decimal> DailyExpenseSeries,
    int ObservedCalendarDays);
