namespace FinTree.Application.Analytics.Services;

internal static class AnalyticsBalanceTimeline
{
    private static readonly TimeSpan OpeningBalanceDetectionWindow = TimeSpan.FromSeconds(5);

    public readonly record struct BalanceEvent(DateTime OccurredAt, decimal Amount, bool IsAdjustment);

    public static Dictionary<Guid, List<BalanceEvent>> BuildBalanceEventsByAccount(
        IReadOnlyCollection<Guid> accountIds,
        IReadOnlyDictionary<Guid, DateTime> accountCreatedAtById,
        IEnumerable<(Guid AccountId, DateTime OccurredAtUtc, decimal DeltaAmount)> transactionDeltas,
        IEnumerable<(Guid AccountId, DateTime OccurredAtUtc, decimal Amount)> adjustments,
        CancellationToken ct)
    {
        var sequencedEventsByAccount = accountIds.ToDictionary(id => id, _ => new List<(BalanceEvent Event, int Sequence)>());
        var sequence = 0;

        foreach (var txn in transactionDeltas)
        {
            ct.ThrowIfCancellationRequested();

            if (!sequencedEventsByAccount.TryGetValue(txn.AccountId, out var events))
                continue;

            events.Add((new BalanceEvent(txn.OccurredAtUtc, txn.DeltaAmount, false), sequence++));
        }

        var adjustmentsByAccount = adjustments
            .GroupBy(a => a.AccountId)
            .ToDictionary(g => g.Key, g => g.OrderBy(a => a.OccurredAtUtc).ToList());

        foreach (var accountAdjustments in adjustmentsByAccount)
        {
            ct.ThrowIfCancellationRequested();

            if (!sequencedEventsByAccount.TryGetValue(accountAdjustments.Key, out var events))
                continue;

            var normalizedAdjustments = accountAdjustments.Value
                .Select(a => new BalanceEvent(a.OccurredAtUtc, a.Amount, true))
                .ToList();

            if (normalizedAdjustments.Count == 1 &&
                accountCreatedAtById.TryGetValue(accountAdjustments.Key, out var accountCreatedAtUtc) &&
                IsOpeningBalanceAnchor(accountCreatedAtUtc, normalizedAdjustments[0].OccurredAt))
            {
                var opening = normalizedAdjustments[0];
                normalizedAdjustments[0] = new BalanceEvent(accountCreatedAtUtc, opening.Amount, true);
            }

            foreach (var adjustment in normalizedAdjustments)
                events.Add((adjustment, sequence++));
        }

        var eventsByAccount = accountIds.ToDictionary(id => id, _ => new List<BalanceEvent>());
        foreach (var accountId in accountIds)
        {
            var orderedEvents = sequencedEventsByAccount[accountId]
                .OrderBy(x => x.Event.OccurredAt)
                .ThenBy(x => x.Event.IsAdjustment ? 1 : 0)
                .ThenBy(x => x.Sequence)
                .Select(x => x.Event)
                .ToList();

            eventsByAccount[accountId] = orderedEvents;
        }

        return eventsByAccount;
    }

    public static void AdvanceBalancesToBoundary(
        DateTime boundaryUtc,
        IReadOnlyCollection<Guid> accountIds,
        IReadOnlyDictionary<Guid, List<BalanceEvent>> eventsByAccount,
        IDictionary<Guid, decimal> balancesByAccount,
        IDictionary<Guid, int> eventIndexByAccount,
        CancellationToken ct)
    {
        foreach (var accountId in accountIds)
        {
            ct.ThrowIfCancellationRequested();

            if (!eventsByAccount.TryGetValue(accountId, out var events))
                continue;

            var idx = eventIndexByAccount[accountId];
            var currentBalance = balancesByAccount[accountId];

            while (idx < events.Count && events[idx].OccurredAt < boundaryUtc)
            {
                currentBalance = ApplyBalanceEvent(currentBalance, events[idx]);
                idx++;
            }

            balancesByAccount[accountId] = currentBalance;
            eventIndexByAccount[accountId] = idx;
        }
    }

    private static decimal ApplyBalanceEvent(decimal currentBalance, BalanceEvent balanceEvent)
        => balanceEvent.IsAdjustment ? balanceEvent.Amount : currentBalance + balanceEvent.Amount;

    private static bool IsOpeningBalanceAnchor(DateTime accountCreatedAtUtc, DateTime adjustmentOccurredAtUtc)
        => (adjustmentOccurredAtUtc - accountCreatedAtUtc).Duration() <= OpeningBalanceDetectionWindow;
}