using FinTree.Application.Analytics.Dto;

namespace FinTree.Application.Analytics.Services.Metrics;

public readonly record struct MonthScoreInputs(
    decimal MonthIncome,
    decimal MonthExpenses,
    decimal DiscretionaryTotal,
    IReadOnlyDictionary<DateOnly, decimal> DailyDiscretionary,
    IReadOnlyList<decimal> StabilityPositiveDailyValues,
    int DaysInMonth,
    decimal LiquidMonths,
    IReadOnlyDictionary<DateOnly, decimal> BaselineDailyDiscretionary);

public readonly record struct MonthScoreResult(
    decimal? SavingsRate,
    decimal? DiscretionarySharePercent,
    Stability? Stability,
    PeakMetricsResult Peaks,
    decimal? TotalMonthScore);

// Единая точка расчёта месячных метрик и общего скора. Используется и Dashboard, и Evolution,
// чтобы оба сервиса работали на идентичных формулах и порогах (включая scaled peak threshold).
public static class MonthScoreBuilder
{
    public static MonthScoreResult Build(MonthScoreInputs inputs)
    {
        var savingsRate = inputs.MonthIncome > 0m
            ? (inputs.MonthIncome - inputs.MonthExpenses) / inputs.MonthIncome
            : (decimal?)null;

        var discretionaryShare = inputs.MonthExpenses > 0m
            ? inputs.DiscretionaryTotal / inputs.MonthExpenses * 100m
            : (decimal?)null;

        var stability = StabilityService.ComputeStability(inputs.StabilityPositiveDailyValues);

        var scaledThreshold = PeakDaysService.ComputeScaledThreshold(
            inputs.BaselineDailyDiscretionary,
            inputs.DailyDiscretionary);

        var peaks = PeakDaysService.Calculate(
            inputs.DailyDiscretionary,
            inputs.DiscretionaryTotal,
            inputs.DaysInMonth,
            scaledThreshold);

        var totalScore = MonthlyScoreService.CalculateTotalMonthScore(
            savingsRate,
            inputs.LiquidMonths,
            stability?.Score,
            discretionaryShare,
            peaks.PeakSpendSharePercent);

        return new MonthScoreResult(savingsRate, discretionaryShare, stability, peaks, totalScore);
    }
}
