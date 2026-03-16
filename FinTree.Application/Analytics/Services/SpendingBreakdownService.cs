using System.Globalization;
using FinTree.Application.Analytics.Dto;
using FinTree.Application.Analytics.Shared;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Analytics.Services;

public sealed class SpendingBreakdownService(
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter)
{
    public async Task<SpendingBreakdownDto> BuildAsync(
        int year, int month, string baseCurrencyCode, CancellationToken ct)
    {
        var monthStartUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEndUtc = monthStartUtc.AddMonths(1);
        var monthsWindowStartUtc = monthStartUtc.AddMonths(-11);

        var rawExpenses = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: monthsWindowStartUtc,
            toUtc: monthEndUtc,
            excludeTransfers: true,
            excludeInvestmentAccounts: true,
            type: TransactionType.Expense,
            ct: ct);

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            rawExpenses.Select(e => (e.Money.CurrencyCode, e.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var dailyTotals = new Dictionary<DateOnly, decimal>();
        foreach (var expense in rawExpenses)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (expense.Money.CurrencyCode, expense.OccurredAtUtc.Date);
            var amountInBaseCurrency = expense.Money.Amount * rateByCurrencyAndDay[rateKey];

            var dayKey = DateOnly.FromDateTime(expense.OccurredAtUtc);
            if (dailyTotals.TryGetValue(dayKey, out var current))
                dailyTotals[dayKey] = current + amountInBaseCurrency;
            else
                dailyTotals[dayKey] = amountInBaseCurrency;
        }

        var firstExpenseDate = dailyTotals.Count > 0 ? dailyTotals.Keys.Min() : (DateOnly?)null;
        var monthStartDate = new DateOnly(year, month, 1);
        var monthEndDate = new DateOnly(year, month, DateTime.DaysInMonth(year, month));

        var days = BuildDailySeries(dailyTotals, firstExpenseDate, monthStartDate, monthEndDate);
        var weeks = BuildWeeklySeries(dailyTotals, firstExpenseDate, monthStartUtc, monthEndUtc);
        var months = BuildMonthlySeries(dailyTotals, firstExpenseDate, monthStartDate, monthsWindowStartUtc);

        return new SpendingBreakdownDto(days, weeks, months);
    }

    private static List<MonthlyExpensesDto> BuildDailySeries(
        Dictionary<DateOnly, decimal> dailyTotals,
        DateOnly? firstExpenseDate,
        DateOnly monthStartDate,
        DateOnly monthEndDate)
    {
        var days = new List<MonthlyExpensesDto>(monthEndDate.Day);
        if (!firstExpenseDate.HasValue)
            return days;

        var dayRangeStart = firstExpenseDate.Value > monthStartDate
            ? firstExpenseDate.Value
            : monthStartDate;

        for (var dateCursor = dayRangeStart;
             dateCursor.DayNumber <= monthEndDate.DayNumber;
             dateCursor = dateCursor.AddDays(1))
        {
            var amount = dailyTotals.GetValueOrDefault(dateCursor, 0m);
            days.Add(new MonthlyExpensesDto(
                dateCursor.Year,
                dateCursor.Month,
                dateCursor.Day,
                null,
                MathService.Round2(amount)));
        }

        return days;
    }

    private static List<MonthlyExpensesDto> BuildWeeklySeries(
        Dictionary<DateOnly, decimal> dailyTotals,
        DateOnly? firstExpenseDate,
        DateTime monthStartUtc,
        DateTime monthEndUtc)
    {
        var weeksWindowStartCandidate = DateOnly.FromDateTime(monthStartUtc.AddMonths(-2));
        var weeksWindowEndExclusive = DateOnly.FromDateTime(monthEndUtc);

        var weeksWindowStart = firstExpenseDate.HasValue && firstExpenseDate.Value > weeksWindowStartCandidate
            ? firstExpenseDate.Value
            : weeksWindowStartCandidate;

        var weekTotals = new Dictionary<(int IsoYear, int IsoWeek), decimal>();
        var dayCursor = weeksWindowStart;
        while (dayCursor.DayNumber < weeksWindowEndExclusive.DayNumber)
        {
            var dayAmount = dailyTotals.GetValueOrDefault(dayCursor, 0m);
            var dayDateTime = dayCursor.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var key = (ISOWeek.GetYear(dayDateTime), ISOWeek.GetWeekOfYear(dayDateTime));

            if (weekTotals.TryGetValue(key, out var currentTotal))
                weekTotals[key] = currentTotal + dayAmount;
            else
                weekTotals[key] = dayAmount;

            dayCursor = dayCursor.AddDays(1);
        }

        return weekTotals
            .Select(kv =>
            {
                var weekStart = ISOWeek.ToDateTime(kv.Key.IsoYear, kv.Key.IsoWeek, DayOfWeek.Monday);
                return new MonthlyExpensesDto(
                    kv.Key.IsoYear,
                    weekStart.Month,
                    null,
                    kv.Key.IsoWeek,
                    MathService.Round2(kv.Value));
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Week)
            .ToList();
    }

    private static List<MonthlyExpensesDto> BuildMonthlySeries(
        Dictionary<DateOnly, decimal> dailyTotals,
        DateOnly? firstExpenseDate,
        DateOnly monthStartDate,
        DateTime monthsWindowStartUtc)
    {
        var months = new List<MonthlyExpensesDto>(12);
        if (!firstExpenseDate.HasValue)
            return months;

        var monthTotals = new Dictionary<(int Year, int Month), decimal>();
        foreach (var dayTotal in dailyTotals)
        {
            var monthKey = (dayTotal.Key.Year, dayTotal.Key.Month);
            if (monthTotals.TryGetValue(monthKey, out var currentTotal))
                monthTotals[monthKey] = currentTotal + dayTotal.Value;
            else
                monthTotals[monthKey] = dayTotal.Value;
        }

        var monthsWindowStartDate = DateOnly.FromDateTime(monthsWindowStartUtc);
        var firstExpenseMonthStart = new DateOnly(firstExpenseDate.Value.Year, firstExpenseDate.Value.Month, 1);
        var monthCursor = firstExpenseMonthStart > monthsWindowStartDate
            ? firstExpenseMonthStart
            : monthsWindowStartDate;

        while (monthCursor.DayNumber <= monthStartDate.DayNumber)
        {
            var monthKey = (monthCursor.Year, monthCursor.Month);
            var monthTotal = monthTotals.GetValueOrDefault(monthKey, 0m);
            months.Add(new MonthlyExpensesDto(
                monthCursor.Year,
                monthCursor.Month,
                null,
                null,
                MathService.Round2(monthTotal)));
            monthCursor = monthCursor.AddMonths(1);
        }

        return months;
    }
}
