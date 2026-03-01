using FinTree.Application.Analytics.Shared;

namespace FinTree.Application.Analytics.Services.Metrics;

public readonly record struct Stability(decimal? Index, decimal? Score, string? Status, string? ActionCode);

public static class StabilityService
{
    public static Stability? ComputeStability(IReadOnlyList<decimal> dailyTotals)
    {
        var stabilityIndex = ComputeStabilityIndex(dailyTotals);
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
        
        var status = ResolveStabilityStatus(index);
        var actionCode = ResolveStabilityActionCode(status);
        return new Stability(index, score, status, actionCode);
    }
    
    private static decimal? ComputeStabilityIndex(IReadOnlyList<decimal> dailyTotals)
    {
        var positiveDailyTotals = dailyTotals
            .Where(value => value > 0m)
            .ToList();

        if (positiveDailyTotals.Count < 4)
            return null;

        var median = MathService.ComputeMedian(positiveDailyTotals);
        if (median is not > 0m)
            return null;

        var q1 = MathService.ComputeQuantile(positiveDailyTotals, 0.25d);
        var q3 = MathService.ComputeQuantile(positiveDailyTotals, 0.75d);
        if (!q1.HasValue || !q3.HasValue)
            return null;

        return (q3.Value - q1.Value) / median.Value;
    }
    
    private static string? ResolveStabilityStatus(decimal? stabilityIndex)
    {
        return stabilityIndex switch
        {
            null => null,
            <= 1.0m => "good",
            <= 2.0m => "average",
            _ => "poor"
        };
    }

    private static string? ResolveStabilityActionCode(string? stabilityStatus)
        => stabilityStatus switch
        {
            "good" => "keep_routine",
            "average" => "smooth_spikes",
            "poor" => "cap_impulse_spend",
            _ => null
        };
}