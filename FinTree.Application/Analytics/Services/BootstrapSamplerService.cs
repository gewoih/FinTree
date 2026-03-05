namespace FinTree.Application.Analytics.Services;

public sealed class BootstrapSamplerService
{
    public double[] BuildRecencyCdf(int poolLength, double lambda)
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

    public decimal SampleFromPool(IReadOnlyList<decimal> pool, double[] cdf, Random rng)
    {
        if (pool.Count == 0)
            return 0m;

        var randomValue = rng.NextDouble();
        var index = Array.BinarySearch(cdf, randomValue);

        if (index < 0)
            index = ~index;

        return pool[Math.Clamp(index, 0, pool.Count - 1)];
    }

    public decimal[] SampleBlock(IReadOnlyList<decimal> pool, double[] cdf, int blockDays, Random rng)
    {
        if (blockDays <= 0)
            throw new ArgumentOutOfRangeException(nameof(blockDays), "blockDays must be greater than zero.");

        var block = new decimal[blockDays];

        if (pool.Count == 0)
            return block;

        var maxStartIndex = Math.Max(pool.Count - blockDays, 0);
        var startCount = maxStartIndex + 1;
        var randomValue = rng.NextDouble();
        var startIndex = cdf.Length == startCount
            ? Array.BinarySearch(cdf, randomValue)
            : (int)Math.Floor(randomValue * startCount);

        if (startIndex < 0)
            startIndex = ~startIndex;

        startIndex = Math.Clamp(startIndex, 0, maxStartIndex);

        for (var day = 0; day < blockDays; day++)
        {
            var index = Math.Min(startIndex + day, pool.Count - 1);
            block[day] = pool[index];
        }

        return block;
    }

    public int BuildDeterministicSeed(int baseSeed, IEnumerable<long> parts)
    {
        var hash = baseSeed;
        foreach (var part in parts)
            hash = HashCode.Combine(hash, part);

        return hash;
    }

    public static long ToCents(decimal value)
        => (long)Math.Round(value * 100m, MidpointRounding.AwayFromZero);
}
