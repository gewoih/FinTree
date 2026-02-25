using FinTree.Application.Accounts;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Application.Users;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;

namespace FinTree.Application.Analytics;

internal sealed class NetWorthTrendAnalyticsCalculator(
    AccountsService accountsService,
    TransactionsService transactionsService,
    UserService userService,
    CurrencyConverter currencyConverter)
    : INetWorthTrendAnalyticsCalculator
{
    public async Task<List<NetWorthSnapshotDto>> GetNetWorthTrendAsync(int months, CancellationToken ct)
    {
        switch (months)
        {
            case <= 0:
                return [];
            case > 12:
                months = 12;
                break;
        }

        var baseCurrencyCode = await userService.GetCurrentUserBaseCurrencyCodeAsync(ct);

        var accounts = await accountsService.GetAccountSnapshotsAsync(includeArchived: true, ct);
        if (accounts.Count == 0)
            return [];

        var accountCreatedAtById = accounts
            .ToDictionary(a => a.Id, a => a.CreatedAtUtc);

        var nowUtc = DateTime.UtcNow;
        var currentMonthStartUtc = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var requestedStartMonthUtc = currentMonthStartUtc
            .AddMonths(-(months - 1));

        var distinctAccountCurrencies = accounts
            .Select(a => a.CurrencyCode)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var accountIds = accounts
            .Select(a => a.Id)
            .ToArray();

        var rawTransactions = await transactionsService.GetTransactionSnapshotsAsync(ct: ct);
        var rawAdjustments = await accountsService.GetAccountAdjustmentSnapshotsAsync(accountIds, ct: ct);

        var earliestDataUtc = accountCreatedAtById.Values.Min();
        if (rawTransactions.Count > 0)
        {
            var firstTransactionUtc = rawTransactions.Min(t => t.OccurredAtUtc);
            if (firstTransactionUtc < earliestDataUtc)
                earliestDataUtc = firstTransactionUtc;
        }

        if (rawAdjustments.Count > 0)
        {
            var firstAdjustmentUtc = rawAdjustments.Min(a => a.OccurredAtUtc);
            if (firstAdjustmentUtc < earliestDataUtc)
                earliestDataUtc = firstAdjustmentUtc;
        }

        var earliestDataMonthUtc = new DateTime(
            earliestDataUtc.Year,
            earliestDataUtc.Month,
            1,
            0,
            0,
            0,
            DateTimeKind.Utc);
        var effectiveStartMonthUtc = earliestDataMonthUtc > requestedStartMonthUtc
            ? earliestDataMonthUtc
            : requestedStartMonthUtc;

        if (effectiveStartMonthUtc > currentMonthStartUtc)
            return [];

        var monthsToBuild = ((currentMonthStartUtc.Year - effectiveStartMonthUtc.Year) * 12) +
                            (currentMonthStartUtc.Month - effectiveStartMonthUtc.Month) + 1;

        var eventsByAccount = AnalyticsBalanceTimeline.BuildBalanceEventsByAccount(
            accountIds,
            accountCreatedAtById,
            rawTransactions.Select(t => (
                t.AccountId,
                t.OccurredAtUtc,
                t.Type == TransactionType.Income ? t.Money.Amount : -t.Money.Amount)),
            rawAdjustments.Select(a => (a.AccountId, a.OccurredAtUtc, a.Amount)),
            ct);

        var balancesByAccount = accountIds.ToDictionary(id => id, _ => 0m);
        var eventIndexByAccount = accountIds.ToDictionary(id => id, _ => 0);

        AnalyticsBalanceTimeline.AdvanceBalancesToBoundary(
            effectiveStartMonthUtc,
            accountIds,
            eventsByAccount,
            balancesByAccount,
            eventIndexByAccount,
            ct);

        var result = new List<NetWorthSnapshotDto>(monthsToBuild);
        for (var i = 0; i < monthsToBuild; i++)
        {
            var boundary = effectiveStartMonthUtc.AddMonths(i + 1);
            var rateAtUtc = boundary.AddTicks(-1);

            var rateByCurrency = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            foreach (var code in distinctAccountCurrencies)
            {
                if (string.Equals(code, baseCurrencyCode, StringComparison.OrdinalIgnoreCase))
                {
                    rateByCurrency[code] = 1m;
                    continue;
                }

                var converted = await currencyConverter.ConvertAsync(
                    new Money(code, 1m),
                    baseCurrencyCode,
                    rateAtUtc,
                    ct);
                rateByCurrency[code] = converted.Amount;
            }

            AnalyticsBalanceTimeline.AdvanceBalancesToBoundary(
                boundary,
                accountIds,
                eventsByAccount,
                balancesByAccount,
                eventIndexByAccount,
                ct);

            var netWorth = 0m;
            foreach (var account in accounts)
            {
                var balance = balancesByAccount[account.Id];
                var rate = rateByCurrency.TryGetValue(account.CurrencyCode, out var foundRate) ? foundRate : 1m;
                netWorth += balance * rate;
            }

            var monthDate = effectiveStartMonthUtc.AddMonths(i);
            result.Add(new NetWorthSnapshotDto(
                monthDate.Year,
                monthDate.Month,
                AnalyticsMath.Round2(netWorth)));
        }

        return result;
    }
}
