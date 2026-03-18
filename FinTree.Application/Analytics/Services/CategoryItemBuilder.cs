using FinTree.Application.Analytics.Dto;
using FinTree.Application.Analytics.Shared;

namespace FinTree.Application.Analytics.Services;

internal static class CategoryItemBuilder
{
    internal static List<CategoryBreakdownItemDto> BuildExpenseItems(
        IReadOnlyDictionary<Guid, CategoryTotals> totals,
        IReadOnlyDictionary<Guid, CategoryMeta> categories,
        decimal totalExpenses)
        => BuildItems(
            totals.Select(kv => (kv.Key, kv.Value.Total, kv.Value.MandatoryTotal, kv.Value.DiscretionaryTotal)),
            categories,
            totalExpenses);

    internal static List<CategoryBreakdownItemDto> BuildIncomeItems(
        IReadOnlyDictionary<Guid, decimal> totals,
        IReadOnlyDictionary<Guid, CategoryMeta> categories,
        decimal totalIncome)
        => BuildItems(
            totals.Select(kv => (kv.Key, kv.Value, 0m, 0m)),
            categories,
            totalIncome);

    private static List<CategoryBreakdownItemDto> BuildItems(
        IEnumerable<(Guid Id, decimal Total, decimal MandatoryTotal, decimal DiscretionaryTotal)> items,
        IReadOnlyDictionary<Guid, CategoryMeta> categories,
        decimal grandTotal)
    {
        var result = new List<CategoryBreakdownItemDto>();

        foreach (var item in items)
        {
            var percent = grandTotal > 0m ? (item.Total / grandTotal) * 100 : (decimal?)null;

            // Guid.Empty is the sentinel for uncategorized transactions; id is returned as null to the client
            if (item.Id == Guid.Empty)
            {
                result.Add(new CategoryBreakdownItemDto(
                    null,
                    string.Empty,
                    string.Empty,
                    MathService.Round2(item.Total),
                    MathService.Round2(item.MandatoryTotal),
                    MathService.Round2(item.DiscretionaryTotal),
                    percent,
                    false));
                continue;
            }

            if (!categories.TryGetValue(item.Id, out var meta))
                continue;

            result.Add(new CategoryBreakdownItemDto(
                item.Id,
                meta.Name,
                meta.Color,
                MathService.Round2(item.Total),
                MathService.Round2(item.MandatoryTotal),
                MathService.Round2(item.DiscretionaryTotal),
                percent,
                meta.IsMandatory));
        }

        result.Sort((a, b) => b.Amount.CompareTo(a.Amount));
        return result;
    }
}