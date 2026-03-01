using FinTree.Application.Analytics.Dto;
using FinTree.Application.Analytics.Shared;

namespace FinTree.Application.Analytics;

public readonly record struct PeakMetricsResult(
    PeakDaysSummaryDto Summary,
    IReadOnlyList<PeakDayDto> Days,
    decimal? PeakSpendSharePercent,
    decimal? PeakDayRatioPercent);

public sealed class PeakDaysService
{
    public static PeakMetricsResult Calculate(
        IReadOnlyDictionary<DateOnly, decimal> discretionaryDailyTotals,
        decimal monthTotal,
        int daysInMonth)
    {
        if (monthTotal <= 0m || discretionaryDailyTotals.Count == 0)
            return Empty(monthTotal);

        var positiveDailyTotals = discretionaryDailyTotals.Values
            .Where(value => value > 0m)
            .ToList();

        if (positiveDailyTotals.Count == 0)
            return Empty(monthTotal);

        var medianDaily = MathService.ComputeMedian(positiveDailyTotals);
        if (medianDaily is not > 0m)
            return Empty(monthTotal);

        var threshold = MathService.ComputePeakThreshold(positiveDailyTotals, medianDaily.Value);
        var peakDays = discretionaryDailyTotals
            .Where(kv => kv.Value >= threshold)
            .Select(kv =>
            {
                var share = (kv.Value / monthTotal) * 100m;
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
            ? (totalPeakAmount / monthTotal) * 100m
            : (decimal?)null;

        var peakDayRatioPercent = daysInMonth > 0
            ? MathService.Round2((decimal)peakDays.Count / daysInMonth * 100m)
            : (decimal?)null;

        var summary = new PeakDaysSummaryDto(
            peakDays.Count,
            MathService.Round2(totalPeakAmount),
            peakSpendSharePercent,
            monthTotal);

        return new PeakMetricsResult(summary, peakDays, peakSpendSharePercent, peakDayRatioPercent);
    }

    private static PeakMetricsResult Empty(decimal monthTotal)
    {
        var summary = new PeakDaysSummaryDto(0, 0m, null, monthTotal);
        return new PeakMetricsResult(summary, [], null, null);
    }
}
