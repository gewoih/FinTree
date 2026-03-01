namespace FinTree.Application.Analytics.Shared;

internal static class MathService
{
    public static decimal Round2(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    public static decimal? ComputeMedian(IReadOnlyList<decimal> values)
    {
        if (values.Count == 0)
            return null;

        var sorted = values.OrderBy(v => v).ToList();
        var mid = sorted.Count / 2;

        return sorted.Count % 2 == 0
            ? (sorted[mid - 1] + sorted[mid]) / 2m
            : sorted[mid];
    }

    public static decimal? ComputeQuantile(IReadOnlyList<decimal> values, double quantile)
    {
        if (values.Count == 0)
            return null;

        var sorted = values.OrderBy(v => v).ToList();
        switch (quantile)
        {
            case <= 0d:
                return sorted[0];
            case >= 1d:
                return sorted[^1];
        }

        var position = (sorted.Count - 1) * quantile;
        var lowerIndex = (int)Math.Floor(position);
        var upperIndex = (int)Math.Ceiling(position);

        if (lowerIndex == upperIndex)
            return sorted[lowerIndex];

        var weight = (decimal)(position - lowerIndex);
        return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * weight;
    }
}