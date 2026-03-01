using FinTree.Application.Accounts;
using FinTree.Application.Analytics.Shared;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;

namespace FinTree.Application.Analytics.Services.Metrics;

public readonly record struct Liquidity(decimal LiquidAssets, decimal LiquidMonths, string? Status);

public sealed class LiquidityService(
    AccountsService accountsService,
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter,
    ExpenseService expenseService)
{
    public async Task<Liquidity> ComputeLiquidity(string baseCurrencyCode, DateTime atUtc, CancellationToken ct)
    {
        var liquidAssets = await GetLiquidAssetsAtAsync(baseCurrencyCode, atUtc, ct);

        var averageDailyExpense =
            await expenseService.GetAverageDailyExpenseAsync(baseCurrencyCode, atUtc, ct);

        var monthlyExpense = averageDailyExpense * 30.44m;
        var liquidMonths = monthlyExpense <= 0m ? 0m : Math.Max(0m, liquidAssets / monthlyExpense);
        var status = ResolveLiquidStatus(liquidMonths);
        return new Liquidity(liquidAssets, liquidMonths, status);
    }

    private async Task<decimal> GetLiquidAssetsAtAsync(string baseCurrencyCode, DateTime atUtc, CancellationToken ct)
    {
        var liquidAccounts = (await accountsService.GetAccountSnapshotsAsync(includeArchived: false, ct))
            .Where(account => account.IsLiquid)
            .ToList();

        if (liquidAccounts.Count == 0)
            return 0m;

        var accountIds = liquidAccounts
            .Select(account => account.Id)
            .ToList();

        var rawAdjustments =
            await accountsService.GetAccountAdjustmentSnapshotsAsync(accountIds, beforeUtc: atUtc, ct: ct);

        var rawTransactions = await transactionsService.GetTransactionSnapshotsAsync(
            toUtc: atUtc,
            accountIds: accountIds,
            ct: ct);

        var adjustmentsByAccount = rawAdjustments
            .GroupBy(adjustment => adjustment.AccountId)
            .ToDictionary(
                group => group.Key,
                group => group.OrderBy(adjustment => adjustment.OccurredAtUtc).ToList());

        var transactionsByAccount = rawTransactions
            .GroupBy(transaction => transaction.AccountId)
            .ToDictionary(
                group => group.Key,
                group => group
                    .Select(transaction => new
                    {
                        Delta = transaction.Type == TransactionType.Income
                            ? transaction.Money.Amount
                            : -transaction.Money.Amount,
                        transaction.OccurredAtUtc,
                    })
                    .OrderBy(transaction => transaction.OccurredAtUtc)
                    .ToList());

        var rateAtUtc = atUtc.AddTicks(-1);
        var rateByCurrency = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

        foreach (var currency in liquidAccounts.Select(account => account.CurrencyCode)
                     .Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (string.Equals(currency, baseCurrencyCode, StringComparison.OrdinalIgnoreCase))
            {
                rateByCurrency[currency] = 1m;
                continue;
            }

            var converted = await currencyConverter.ConvertAsync(
                new Money(currency, 1m),
                baseCurrencyCode,
                rateAtUtc,
                ct);

            rateByCurrency[currency] = converted.Amount;
        }

        var total = 0m;

        foreach (var account in liquidAccounts)
        {
            var balance = 0m;
            DateTime? anchorAt = null;

            if (adjustmentsByAccount.TryGetValue(account.Id, out var accountAdjustments) &&
                accountAdjustments.Count > 0)
            {
                var latestAdjustment = accountAdjustments[^1];
                balance = latestAdjustment.Amount;
                anchorAt = latestAdjustment.OccurredAtUtc;
            }

            if (transactionsByAccount.TryGetValue(account.Id, out var accountTransactions) &&
                accountTransactions.Count > 0)
            {
                var delta = accountTransactions
                    .Where(transaction => !anchorAt.HasValue || transaction.OccurredAtUtc > anchorAt.Value)
                    .Sum(transaction => transaction.Delta);

                balance += delta;
            }

            var rate = rateByCurrency.GetValueOrDefault(account.CurrencyCode, 1m);
            total += balance * rate;
        }

        return MathService.Round2(total);
    }

    private static string? ResolveLiquidStatus(decimal? liquidMonths)
    {
        return liquidMonths switch
        {
            null => null,
            > 6m => "good",
            >= 3m => "average",
            _ => "poor"
        };
    }
}