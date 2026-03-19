using FinTree.Application.Analytics.Dto;
using FinTree.Application.Analytics.Shared;

namespace FinTree.Application.Analytics.Services.Metrics;

public sealed class PeakDaysService
{
    /// <summary>
    /// Вычисляет порог пиковых дней из исторических данных и нормализует его
    /// к масштабу текущего месяца. Возвращает null, если данных недостаточно.
    /// </summary>
    public static decimal? ComputeScaledThreshold(
        IReadOnlyDictionary<DateOnly, decimal> baselineDailyTotals,
        IReadOnlyDictionary<DateOnly, decimal> currentDailyTotals)
    {
        var baselinePositive = baselineDailyTotals.Values.Where(v => v > 0m).ToList();
        if (baselinePositive.Count < 3)
            return null;

        var baselineMedian = MathService.ComputeMedian(baselinePositive);
        if (baselineMedian is not > 0m)
            return null;

        var baselineThreshold = ComputePeakThreshold(baselinePositive, baselineMedian.Value);

        var currentPositive = currentDailyTotals.Values.Where(v => v > 0m).ToList();
        if (currentPositive.Count == 0)
            return baselineThreshold;

        var currentMedian = MathService.ComputeMedian(currentPositive);
        if (currentMedian is not > 0m)
            return baselineThreshold;

        var scaleFactor = Math.Clamp(currentMedian.Value / baselineMedian.Value, 0.25m, 4.0m);
        return baselineThreshold * scaleFactor;
    }

    public static PeakMetricsResult Calculate(
        IReadOnlyDictionary<DateOnly, decimal> dailyTotals,
        decimal monthTotal,
        int daysInMonth,
        decimal? externalThreshold = null)
    {
        if (monthTotal <= 0m || dailyTotals.Count == 0)
            return Empty(monthTotal, daysInMonth);

        var positiveDailyTotals = dailyTotals.Values
            .Where(value => value > 0m)
            .ToList();

        if (positiveDailyTotals.Count == 0)
            return Empty(monthTotal, daysInMonth);

        var medianDaily = MathService.ComputeMedian(positiveDailyTotals);
        if (medianDaily is not > 0m)
            return Empty(monthTotal, daysInMonth);

        var threshold = externalThreshold is > 0m
            ? externalThreshold.Value
            : ComputePeakThreshold(positiveDailyTotals, medianDaily.Value);

        var rawPeakEntries = dailyTotals.Where(kv => kv.Value >= threshold).ToList();
        var totalPeakAmount = rawPeakEntries.Sum(kv => kv.Value);
        var peakSpendSharePercent = ResolvePeakSpendSharePercent(totalPeakAmount, monthTotal);

        var peakDays = rawPeakEntries
            .Select(kv => new PeakDayDto(
                kv.Key.Year,
                kv.Key.Month,
                kv.Key.Day,
                MathService.Round2(kv.Value),
                kv.Value / monthTotal * 100m))
            .OrderByDescending(day => day.Amount)
            .ToList();

        var peakDayRatioPercent = daysInMonth > 0
            ? (decimal)peakDays.Count / daysInMonth * 100m
            : (decimal?)null;

        var summary = new PeakDaysSummaryDto(
            peakDays.Count,
            MathService.Round2(totalPeakAmount),
            peakSpendSharePercent,
            monthTotal);

        return new PeakMetricsResult(summary, peakDays, peakSpendSharePercent, peakDayRatioPercent);
    }

    private static decimal ComputePeakThreshold(List<decimal> positiveDailyTotals, decimal medianDaily)
    {
        var absoluteDeviations = positiveDailyTotals
            .Select(value => Math.Abs(value - medianDaily))
            .ToList();

        var mad = MathService.ComputeMedian(absoluteDeviations) ?? 0m;

        return mad > 0m
            ? medianDaily + 2.5m * mad
            : medianDaily * 1.5m;
    }

    private static PeakMetricsResult Empty(decimal monthTotal, int daysInMonth)
    {
        var peakSpendSharePercent = ResolvePeakSpendSharePercent(0m, monthTotal);
        var peakDayRatioPercent = ResolvePeakDayRatioPercent(monthTotal, daysInMonth);
        var summary = new PeakDaysSummaryDto(0, 0m, peakSpendSharePercent, monthTotal);
        return new PeakMetricsResult(summary, [], peakSpendSharePercent, peakDayRatioPercent);
    }

    private static decimal? ResolvePeakSpendSharePercent(decimal totalPeakAmount, decimal monthTotal)
        => monthTotal > 0m
            ? totalPeakAmount / monthTotal * 100m
            : (decimal?)null;

    private static decimal? ResolvePeakDayRatioPercent(decimal monthTotal, int daysInMonth)
        => monthTotal > 0m && daysInMonth > 0
            ? 0m
            : (decimal?)null;
}
