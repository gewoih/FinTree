using FinTree.Application.Analytics.Dto;

namespace FinTree.Application.Analytics.Services;

public static class CategoryDeltaService
{
    private const int DeltaCategoriesSize = 3;

    private const int MinDaysPerMonth = 7;

    public static CategoryDeltaDto GetCategoryDeltas(
        IReadOnlyDictionary<Guid, CategoryTotals> currentTotals,
        IReadOnlyDictionary<(int Year, int Month), IReadOnlyDictionary<Guid, decimal>> priorTotalsByMonth,
        IReadOnlyDictionary<(int Year, int Month), int> priorDaysByMonth,
        Dictionary<Guid, CategoryMeta> categories)
    {
        // Only months with enough activity are representative baselines.
        // Fall back to all months if none qualify (e.g. brand-new user).
        var qualifyingMonths = priorDaysByMonth
            .Where(kv => kv.Value >= MinDaysPerMonth)
            .Select(kv => kv.Key)
            .ToHashSet();

        var monthsToUse = qualifyingMonths.Count > 0 ? qualifyingMonths : priorDaysByMonth.Keys.ToHashSet();
        var monthCount = Math.Max(monthsToUse.Count, 1);

        var baselineTotals = new Dictionary<Guid, decimal>();
        foreach (var month in monthsToUse)
        {
            if (!priorTotalsByMonth.TryGetValue(month, out var monthTotals))
                continue;
            foreach (var (categoryId, amount) in monthTotals)
            {
                baselineTotals.TryGetValue(categoryId, out var existing);
                baselineTotals[categoryId] = existing + amount;
            }
        }

        var averagedBaseline = baselineTotals.ToDictionary(kv => kv.Key, kv => kv.Value / monthCount);

        return GetCategoryDeltas(
            currentTotals.ToDictionary(kv => kv.Key, kv => kv.Value.Total),
            averagedBaseline,
            categories);
    }

    private static CategoryDeltaDto GetCategoryDeltas(
        Dictionary<Guid, decimal> currentTotals,
        Dictionary<Guid, decimal> previousTotals,
        Dictionary<Guid, CategoryMeta> categories)
    {
        var ids = new HashSet<Guid>(currentTotals.Keys);
        ids.UnionWith(previousTotals.Keys);

        var deltas = new List<CategoryDeltaItemDto>();
        foreach (var id in ids)
        {
            var current = currentTotals.GetValueOrDefault(id, 0m);
            var previous = previousTotals.GetValueOrDefault(id, 0m);
            if ((current == 0m && previous == 0m) || previous <= 0m || !categories.TryGetValue(id, out var info))
                continue;

            var delta = current - previous;
            var deltaPercent = delta / previous * 100m;

            deltas.Add(new CategoryDeltaItemDto(
                id,
                info.Name,
                info.Color,
                current,
                previous,
                delta,
                deltaPercent));
        }

        var increased = deltas
            .Where(x => x.DeltaAmount > 0)
            .OrderByDescending(x => x.DeltaAmount)
            .Take(DeltaCategoriesSize)
            .ToList();

        var decreased = deltas
            .Where(x => x.DeltaAmount < 0)
            .OrderBy(x => x.DeltaAmount)
            .Take(DeltaCategoriesSize)
            .ToList();

        return new CategoryDeltaDto(increased, decreased);
    }
}