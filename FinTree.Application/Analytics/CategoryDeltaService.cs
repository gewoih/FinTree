using FinTree.Application.Analytics.Dto;

namespace FinTree.Application.Analytics;

public static class CategoryDeltaService
{
    private const int DeltaCategoriesSize = 3;

    public static CategoryDeltaDto GetCategoryDeltas(
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