using FinTree.Application.Analytics.Dto;
using FinTree.Application.Analytics.Shared;

namespace FinTree.Application.Analytics.Services;

internal static class CategoryItemBuilder
{
    private static readonly CategoryMeta UnknownMeta = new(AnalyticsCommon.UnknownCategoryName,
        AnalyticsCommon.UnknownCategoryColor, false);

    private static CategoryMeta GetMeta(IReadOnlyDictionary<Guid, CategoryMeta> categories, Guid id)
        => categories.GetValueOrDefault(id, UnknownMeta);

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
        => items
            .Select(item =>
            {
                var meta = GetMeta(categories, item.Id);
                var percent = grandTotal > 0m ? (item.Total / grandTotal) * 100 : (decimal?)null;
                return new CategoryBreakdownItemDto(
                    item.Id,
                    meta.Name,
                    meta.Color,
                    MathService.Round2(item.Total),
                    MathService.Round2(item.MandatoryTotal),
                    MathService.Round2(item.DiscretionaryTotal),
                    percent,
                    meta.IsMandatory);
            })
            .OrderByDescending(x => x.Amount)
            .ToList();
}