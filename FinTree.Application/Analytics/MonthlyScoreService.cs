namespace FinTree.Application.Analytics;

public sealed class MonthlyScoreService
{
    private const decimal CushionSaturationMonths = 12m;

    public static int? CalculateTotalMonthScore(
        decimal? savingsRate,
        decimal? liquidMonths,
        int? stabilityScore,
        decimal? discretionarySharePercent,
        decimal? peakSpendSharePercent)
    {
        var normalizedScores = new List<decimal>(capacity: 5);

        AddIfPresent(normalizedScores, NormalizeRatio(savingsRate));
        AddIfPresent(normalizedScores, NormalizeRatio(liquidMonths / CushionSaturationMonths));
        AddIfPresent(normalizedScores, NormalizeRatio(stabilityScore / 100m));
        AddIfPresent(normalizedScores, InvertPercent(discretionarySharePercent));
        AddIfPresent(normalizedScores, InvertPercent(peakSpendSharePercent));

        if (normalizedScores.Count < 3)
            return null;

        var weightedMean = normalizedScores.Average();
        var score = Math.Clamp(weightedMean * 100m, 0m, 100m);

        return (int)Math.Round(score, 0, MidpointRounding.AwayFromZero);
    }

    private static void AddIfPresent(ICollection<decimal> normalizedScores, decimal? value)
    {
        if (!value.HasValue)
            return;

        normalizedScores.Add(value.Value);
    }

    private static decimal? NormalizeRatio(decimal? value)
    {
        if (!value.HasValue)
            return null;

        return Math.Clamp(value.Value, 0m, 1m);
    }

    private static decimal? InvertPercent(decimal? percent)
    {
        if (!percent.HasValue)
            return null;

        var normalized = Math.Clamp(percent.Value / 100m, 0m, 1m);
        return 1m - normalized;
    }
}
