namespace FinTree.Application.Analytics.Dto;

public readonly record struct CategoryDeltaDto(
    IReadOnlyList<CategoryDeltaItemDto> Increased,
    IReadOnlyList<CategoryDeltaItemDto> Decreased);