namespace FinTree.Application.Analytics.Services.Metrics;

public sealed class MonthlyScoreService
{
    private const decimal SavingsRateTarget = 0.30m;
    private const decimal LiquidityMonthsTarget = 6m;
    private const decimal DiscretionaryShareTargetPercent = 20m;
    private const decimal PeakSpendShareTargetPercent = 15m;

    public static decimal? CalculateTotalMonthScore(
        decimal? savingsRate,
        decimal liquidMonths,
        decimal? stabilityScore,
        decimal? discretionaryShare,
        decimal? peakSpendShare)
    {
        // Каждая компонента нормализована в [0, 100]: 100 баллов = достигнут «отличный» порог, выше — cap.
        // Пороги совпадают с теми, что показаны пользователю в UI как ориентиры «нормы/цели».
        decimal? savingsComponent = savingsRate.HasValue
            ? Math.Clamp(savingsRate.Value / SavingsRateTarget * 100m, 0m, 100m)
            : null;

        var liquidityComponent = Math.Clamp(liquidMonths / LiquidityMonthsTarget * 100m, 0m, 100m);

        decimal? discretionaryComponent = discretionaryShare.HasValue
            ? ScoreInversePercent(discretionaryShare.Value, DiscretionaryShareTargetPercent)
            : null;

        decimal? peakComponent = peakSpendShare.HasValue
            ? ScoreInversePercent(peakSpendShare.Value, PeakSpendShareTargetPercent)
            : null;

        var normalizedScores = new List<decimal?>
        {
            savingsComponent,
            liquidityComponent,
            stabilityScore,
            discretionaryComponent,
            peakComponent
        };

        if (normalizedScores.Any(score => score is null))
            return null;

        return normalizedScores.Average()!.Value;
    }

    // Шкала «чем меньше, тем лучше»: 100 баллов при value ≤ target, 0 баллов при value ≥ 100%, линейно между.
    private static decimal ScoreInversePercent(decimal valuePercent, decimal targetPercent)
    {
        if (valuePercent <= targetPercent) return 100m;
        if (valuePercent >= 100m) return 0m;
        return (100m - valuePercent) / (100m - targetPercent) * 100m;
    }
}
