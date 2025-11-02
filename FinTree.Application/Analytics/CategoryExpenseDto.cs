namespace FinTree.Application.Analytics;

public readonly record struct CategoryExpenseDto(
    Guid Id,
    string Name,
    string Color,
    decimal Amount);