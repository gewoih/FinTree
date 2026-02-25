using FinTree.Application.Exceptions;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Analytics;

internal static class AnalyticsMath
{
    public static decimal Round2(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    public static decimal? ComputeMedian(IReadOnlyList<decimal> values)
    {
        if (values.Count == 0)
            return null;

        var sorted = values.OrderBy(v => v).ToList();
        var mid = sorted.Count / 2;

        return sorted.Count % 2 == 0
            ? (sorted[mid - 1] + sorted[mid]) / 2m
            : sorted[mid];
    }

    public static decimal? ComputeQuantile(IReadOnlyList<decimal> values, double quantile)
    {
        if (values.Count == 0)
            return null;

        var sorted = values.OrderBy(v => v).ToList();
        if (quantile <= 0d)
            return sorted[0];
        if (quantile >= 1d)
            return sorted[^1];

        var position = (sorted.Count - 1) * quantile;
        var lowerIndex = (int)Math.Floor(position);
        var upperIndex = (int)Math.Ceiling(position);

        if (lowerIndex == upperIndex)
            return sorted[lowerIndex];

        var weight = (decimal)(position - lowerIndex);
        return sorted[lowerIndex] + ((sorted[upperIndex] - sorted[lowerIndex]) * weight);
    }

    public static decimal ComputePeakThreshold(IReadOnlyList<decimal> positiveDailyTotals, decimal medianDaily)
    {
        if (positiveDailyTotals.Count < 10)
            return medianDaily * 2m;

        var p90 = ComputeQuantile(positiveDailyTotals, 0.90d) ?? medianDaily * 2m;
        var absoluteDeviations = positiveDailyTotals
            .Select(value => Math.Abs(value - medianDaily))
            .ToList();
        var mad = ComputeMedian(absoluteDeviations) ?? 0m;
        var robustThreshold = medianDaily + (1.2m * mad);

        return Math.Max(p90, robustThreshold);
    }

    public static decimal? ComputeStabilityIndex(IReadOnlyList<decimal> dailyTotals)
    {
        var positiveDailyTotals = dailyTotals
            .Where(value => value > 0m)
            .ToList();

        if (positiveDailyTotals.Count < 4)
            return null;

        var median = ComputeMedian(positiveDailyTotals);
        if (median is not > 0m)
            return null;

        var q1 = ComputeQuantile(positiveDailyTotals, 0.25d);
        var q3 = ComputeQuantile(positiveDailyTotals, 0.75d);
        if (!q1.HasValue || !q3.HasValue)
            return null;

        return (q3.Value - q1.Value) / median.Value;
    }

    public static string? ResolveLiquidStatus(decimal? liquidMonths)
    {
        if (!liquidMonths.HasValue)
            return null;
        if (liquidMonths.Value > 6m)
            return "good";
        if (liquidMonths.Value >= 3m)
            return "average";
        return "poor";
    }
}

internal static class AnalyticsNormalization
{
    public static DateTime NormalizeUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Unspecified)
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return value.ToUniversalTime();
    }

    public static string NormalizeCurrencyCode(string value)
        => string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToUpperInvariant();

    public static void ValidateYearMonth(int year, int month)
    {
        if (year is < 2000 or > 2100)
            throw new DomainValidationException(
                "Некорректный год.",
                "invalid_year",
                new { year });

        if (month is < 1 or > 12)
            throw new DomainValidationException(
                "Некорректный месяц.",
                "invalid_month",
                new { month });
    }
}

internal static class AnalyticsBalanceTimeline
{
    private static readonly TimeSpan OpeningBalanceDetectionWindow = TimeSpan.FromSeconds(5);

    internal readonly record struct BalanceEvent(DateTime OccurredAt, decimal Amount, bool IsAdjustment);

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
