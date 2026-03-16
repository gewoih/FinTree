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
}
