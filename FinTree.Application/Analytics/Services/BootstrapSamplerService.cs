namespace FinTree.Application.Analytics.Services;

public sealed class BootstrapSamplerService
{
    public static double[] BuildRecencyCdf(int poolLength, double lambda)
    {
        if (poolLength <= 0)
            return [];

        var cdf = new double[poolLength];
        var weightSum = 0d;

        for (var index = 0; index < poolLength; index++)
        {
            var age = poolLength - 1 - index;
            weightSum += Math.Exp(-lambda * age);
            cdf[index] = weightSum;
        }

        if (weightSum <= 0d)
            return cdf;

        for (var index = 0; index < poolLength; index++)
            cdf[index] /= weightSum;

        return cdf;
    }

    public static decimal SampleFromPool(IReadOnlyList<decimal> pool, double[] cdf, Random rng)
    {
        if (pool.Count == 0)
            return 0m;

        var randomValue = rng.NextDouble();
        var index = Array.BinarySearch(cdf, randomValue);

        if (index < 0)
            index = ~index;

        return pool[Math.Clamp(index, 0, pool.Count - 1)];
    }

    public static int BuildDeterministicSeed(int baseSeed, IEnumerable<long> parts)
    {
        return parts.Aggregate(baseSeed, HashCode.Combine);
    }

    public static long ToCents(decimal value)
        => (long)Math.Round(value * 100m, MidpointRounding.AwayFromZero);

    public static decimal[] Winsorize(IReadOnlyList<decimal> values, double lowerQuantile, double upperQuantile)
    {
        if (values.Count == 0)
            return [];

        var sorted = values.ToArray();
        Array.Sort(sorted);

        var lowerIndex = Math.Clamp((int)Math.Floor((sorted.Length - 1) * lowerQuantile), 0, sorted.Length - 1);
        var upperIndex = Math.Clamp((int)Math.Ceiling((sorted.Length - 1) * upperQuantile), lowerIndex, sorted.Length - 1);

        var lower = sorted[lowerIndex];
        var upper = sorted[upperIndex];

        var winsorized = new decimal[values.Count];
        for (var i = 0; i < values.Count; i++)
            winsorized[i] = Math.Clamp(values[i], lower, upper);

        return winsorized;
    }

    public static int GetBlockStartCount(int poolLength, int blockDays)
    {
        if (poolLength <= 0 || blockDays <= 0)
            return 0;

        return Math.Max(1, poolLength - blockDays + 1);
    }

    public static int SampleBlockStartIndex(int poolLength, double[] cdf, int blockDays, Random rng)
    {
        if (poolLength <= 0)
            return 0;

        var maxStartIndex = Math.Max(poolLength - blockDays, 0);
        var startCount = maxStartIndex + 1;

        var randomValue = rng.NextDouble();
        var startIndex = cdf.Length == startCount
            ? Array.BinarySearch(cdf, randomValue)
            : (int)Math.Floor(randomValue * startCount);

        if (startIndex < 0)
            startIndex = ~startIndex;

        return Math.Clamp(startIndex, 0, maxStartIndex);
    }
}
