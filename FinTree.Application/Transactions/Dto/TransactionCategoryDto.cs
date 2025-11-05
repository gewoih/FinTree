using FinTree.Domain.Categories;

namespace FinTree.Application.Transactions.Dto;

public readonly record struct TransactionCategoryDto(
    Guid Id,
    string Name,
    string Color,
    bool IsSystem,
    CategoryType Type);