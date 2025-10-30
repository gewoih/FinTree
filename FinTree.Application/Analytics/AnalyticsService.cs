using FinTree.Application.Currencies;
using FinTree.Application.Users;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Analytics;

public sealed class AnalyticsService(
    AppDbContext context,
    ICurrentUser currentUserService,
    CurrencyConverter currencyConverter)
{
    public async Task<IReadOnlyList<MonthlyExpensesDto>> GetMonthlyExpensesAsync(DateTime? from = null,
        DateTime? to = null, CancellationToken ct = default)
    {
        var currentUserId = currentUserService.Id;
        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var transactionsQuery = context.ExpenseTransactions.Where(t => t.Account.UserId == currentUserId);

        if (from.HasValue)
            transactionsQuery = transactionsQuery.Where(t => t.OccurredAt >= from.Value);

        if (to.HasValue)
            transactionsQuery = transactionsQuery.Where(t => t.OccurredAt <= to.Value);

        var transactionDatas = await transactionsQuery
            .Select(t => new { t.Money, t.OccurredAt })
            .ToListAsync(cancellationToken: ct);

        var totals = new Dictionary<(int Year, int Month), decimal>();
        foreach (var r in transactionDatas)
        {
            ct.ThrowIfCancellationRequested();

            // Нормализуем дату в UTC (если Kind не задан — считаем, что это уже UTC)
            var dt = r.OccurredAt;
            var occurredUtc = (dt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
                : dt).ToUniversalTime();

            var valueBase = await currencyConverter.ConvertAsync(
                money: r.Money,
                toCurrencyCode: baseCurrencyCode,
                atUtc: occurredUtc,
                ct: ct);

            var key = (occurredUtc.Year, occurredUtc.Month);
            if (totals.TryGetValue(key, out var sum))
                totals[key] = sum + valueBase;
            else
                totals[key] = valueBase;
        }

        var result = totals
            .Select(kv => new MonthlyExpensesDto(
                Year: kv.Key.Year,
                Month: kv.Key.Month,
                Amount: kv.Value))
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();

        return result;
    }
}