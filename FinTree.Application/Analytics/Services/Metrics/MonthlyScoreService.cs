namespace FinTree.Application.Analytics.Services.Metrics;

public sealed class MonthlyScoreService
{
    private const decimal CushionSaturationMonths = 12m;

    public static decimal? CalculateTotalMonthScore(
        decimal? savingsRate,
        decimal liquidMonths,
        decimal? stabilityScore,
        decimal? discretionaryShare,
        decimal? peakSpendShare)
    {
        // Each component is normalized to [0, 100].
        // savingsRate floor is 0: deficit spending contributes 0, not a negative drag.
        // liquidMonths saturates at CushionSaturationMonths: larger cushion doesn't inflate the score.
        decimal? savingsComponent = savingsRate.HasValue
            ? Math.Clamp(savingsRate.Value * 100m, 0m, 100m)
            : null;

        var liquidityComponent = Math.Clamp(liquidMonths / CushionSaturationMonths * 100m, 0m, 100m);

        decimal? discretionaryComponent = discretionaryShare.HasValue
            ? Math.Clamp(100m - discretionaryShare.Value, 0m, 100m)
            : null;

        decimal? peakComponent = peakSpendShare.HasValue
            ? Math.Clamp(100m - peakSpendShare.Value, 0m, 100m)
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
}
