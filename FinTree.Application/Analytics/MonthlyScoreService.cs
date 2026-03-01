namespace FinTree.Application.Analytics;

public sealed class MonthlyScoreService
{
    private const decimal CushionSaturationMonths = 12m;

    public static int? CalculateTotalMonthScore(
        decimal? savingsRate,
        decimal? liquidMonths,
        int? stabilityScore,
        decimal? discretionaryShare,
        decimal? peakSpendShare)
    {
        var normalizedScores = new List<decimal?>
        {
            savingsRate * 100,
            liquidMonths / CushionSaturationMonths * 100,
            stabilityScore,
            100 - discretionaryShare,
            100 - peakSpendShare
        };

        var weightedMean = normalizedScores.Average();
        if (!weightedMean.HasValue || normalizedScores.Any(score => score is null))
            return null;
        
        return (int)Math.Round(weightedMean.Value, 0);
    }
}
