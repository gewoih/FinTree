using FinTree.Application.Analytics.Dto;
using FinTree.Application.Analytics.Shared;

namespace FinTree.Application.Analytics.Services.Metrics;

public sealed class PeakDaysService
{
    public static PeakMetricsResult Calculate(
        IReadOnlyDictionary<DateOnly, decimal> dailyTotals,
        decimal monthTotal,
        int daysInMonth)
    {
        if (monthTotal <= 0m || dailyTotals.Count == 0)
            return Empty(monthTotal);
        
        var positiveDailyTotals = dailyTotals.Values
            .Where(value => value > 0m)
            .ToList();
        
        if (positiveDailyTotals.Count == 0)
            return Empty(monthTotal);

        var medianDaily = MathService.ComputeMedian(positiveDailyTotals);
        if (medianDaily is not > 0m)
            return Empty(monthTotal);

        var threshold = ComputePeakThreshold(positiveDailyTotals, medianDaily.Value);
        var peakDays = dailyTotals
            .Where(kv => kv.Value >= threshold)
            .Select(kv =>
            {
                var share = kv.Value / monthTotal * 100m;
                return new PeakDayDto(
                    kv.Key.Year,
                    kv.Key.Month,
                    kv.Key.Day,
                    MathService.Round2(kv.Value),
                    share);
            })
            .OrderByDescending(day => day.Amount)
            .ToList();

        var totalPeakAmount = peakDays.Sum(day => day.Amount);
        var peakSpendSharePercent = totalPeakAmount > 0m
            ? totalPeakAmount / monthTotal * 100m
            : (decimal?)null;

        var peakDayRatioPercent = daysInMonth > 0
            ? MathService.Round2((decimal)peakDays.Count / daysInMonth * 100m)
            : (decimal?)null;

        var summary = new PeakDaysSummaryDto(
            peakDays.Count,
            totalPeakAmount,
            peakSpendSharePercent,
            monthTotal);

        return new PeakMetricsResult(summary, peakDays, peakSpendSharePercent, peakDayRatioPercent);
    }

    private static decimal ComputePeakThreshold(List<decimal> positiveDailyTotals, decimal medianDaily)
    {
        if (positiveDailyTotals.Count < 10)
            return medianDaily * 2m;

        var p90 = MathService.ComputeQuantile(positiveDailyTotals, 0.90d) ?? medianDaily * 2m;
        var absoluteDeviations = positiveDailyTotals
            .Select(value => Math.Abs(value - medianDaily))
            .ToList();
        
        var mad = MathService.ComputeMedian(absoluteDeviations) ?? 0m;
        var robustThreshold = medianDaily + 1.2m * mad;

        return Math.Max(p90, robustThreshold);
    }
    
    private static PeakMetricsResult Empty(decimal monthTotal)
    {
        var summary = new PeakDaysSummaryDto(0, 0m, null, monthTotal);
        return new PeakMetricsResult(summary, [], null, null);
    }
}
