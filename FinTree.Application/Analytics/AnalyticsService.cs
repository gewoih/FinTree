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
            .FirstOrDefaultAsync(ct) ?? "RUB";

        var transactionsQuery = context.ExpenseTransactions.Where(t => t.Account.UserId == currentUserId);

        if (from.HasValue)
            transactionsQuery = transactionsQuery.Where(t => t.OccurredAt >= from.Value);

        if (to.HasValue)
            transactionsQuery = transactionsQuery.Where(t => t.OccurredAt <= to.Value);

        var transactionDatas = await transactionsQuery
            .Select(t => new { t.Money, t.OccurredAt })
            .ToListAsync(cancellationToken: ct);

        var converted = await Task.WhenAll(transactionDatas.Select(async r =>
        {
            var valueBase = await currencyConverter.ConvertAsync(
                money: r.Money,
                toCurrencyCode: baseCurrencyCode,
                atUtc: r.OccurredAt,
                ct: ct);

            var dt = r.OccurredAt;
            var d = (dt.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(dt, DateTimeKind.Utc) : dt)
                .ToUniversalTime();

            return new { d.Year, d.Month, AmountBase = valueBase };
        }));

        var result = converted
            .GroupBy(x => new { x.Year, x.Month })
            .Select(g => new MonthlyExpensesDto(
                Year: g.Key.Year,
                Month: g.Key.Month,
                Amount: g.Sum(x => x.AmountBase)))
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();

        return result;
    }
}