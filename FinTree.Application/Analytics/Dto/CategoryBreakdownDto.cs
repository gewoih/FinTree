namespace FinTree.Application.Analytics.Dto;

public readonly record struct CategoryBreakdownDto(
    IReadOnlyList<CategoryBreakdownItemDto> Items,
    CategoryDeltaDto Delta);