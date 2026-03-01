namespace FinTree.Application.Analytics.Shared;

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

    private static decimal? ComputeQuantile(IReadOnlyList<decimal> values, double quantile)
    {
        if (values.Count == 0)
            return null;

        var sorted = values.OrderBy(v => v).ToList();
        switch (quantile)
        {
            case <= 0d:
                return sorted[0];
            case >= 1d:
                return sorted[^1];
        }

        var position = (sorted.Count - 1) * quantile;
        var lowerIndex = (int)Math.Floor(position);
        var upperIndex = (int)Math.Ceiling(position);

        if (lowerIndex == upperIndex)
            return sorted[lowerIndex];

        var weight = (decimal)(position - lowerIndex);
        return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * weight;
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
        var robustThreshold = medianDaily + 1.2m * mad;

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

    public static string? ResolveStabilityStatus(decimal? stabilityIndex)
    {
        return stabilityIndex switch
        {
            null => null,
            <= 1.0m => "good",
            <= 2.0m => "average",
            _ => "poor"
        };
    }

    public static string? ResolveStabilityActionCode(string? stabilityStatus)
        => stabilityStatus switch
        {
            "good" => "keep_routine",
            "average" => "smooth_spikes",
            "poor" => "cap_impulse_spend",
            _ => null
        };

    public static int? ComputeStabilityScore(decimal? stabilityIndex)
    {
        if (!stabilityIndex.HasValue)
            return null;

        var index = stabilityIndex.Value;
        var score = index switch
        {
            <= 1.0m => 100m - index * 30m,
            <= 2.0m => 70m - (index - 1.0m) * 30m,
            <= 4.0m => 40m - (index - 2.0m) * 20m,
            _ => 0m
        };

        var clamped = Math.Clamp(score, 0m, 100m);
        return (int)Math.Round(clamped, 0, MidpointRounding.AwayFromZero);
    }

    public static string? ResolveLiquidStatus(decimal? liquidMonths)
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