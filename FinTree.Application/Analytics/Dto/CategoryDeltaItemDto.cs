namespace FinTree.Application.Analytics.Dto;

public readonly record struct CategoryDeltaItemDto(
    Guid Id,
    string Name,
    string Color,
    decimal CurrentAmount,
    decimal PreviousAmount,
    decimal DeltaAmount,
    decimal? DeltaPercent);