namespace FinTree.Application.Analytics.Dto;

public readonly record struct CategoryBreakdownItemDto(
    Guid Id,
    string Name,
    string Color,
    decimal Amount,
    decimal MandatoryAmount,
    decimal DiscretionaryAmount,
    decimal? Percent,
    bool IsMandatory);