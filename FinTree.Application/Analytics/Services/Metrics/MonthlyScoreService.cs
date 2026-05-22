namespace FinTree.Application.Analytics.Services.Metrics;

public sealed class MonthlyScoreService
{
    public static decimal? CalculateTotalMonthScore(
        decimal? savingsRate,
        decimal liquidMonths,
        decimal? stabilityScore,
        decimal? discretionaryShare)
    {
        // Каждая компонента нормализована в [0, 100]: 100 баллов = достигнут «отличный» порог, выше — cap.
        // Пороги совпадают с теми, что показаны пользователю в UI как ориентиры «нормы/цели».
        decimal? savingsComponent = savingsRate.HasValue
            ? Math.Clamp(savingsRate.Value / (HealthThresholds.SavingsRateTargetPercent / 100m) * 100m, 0m, 100m)
            : null;

        var liquidityComponent = Math.Clamp(liquidMonths / HealthThresholds.LiquidityMonthsTarget * 100m, 0m, 100m);

        decimal? discretionaryComponent = discretionaryShare.HasValue
            ? ScoreInversePercent(discretionaryShare.Value, HealthThresholds.DiscretionaryShareTargetPercent)
            : null;

        var normalizedScores = new List<decimal?>
        {
            savingsComponent,
            liquidityComponent,
            stabilityScore,
            discretionaryComponent
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
