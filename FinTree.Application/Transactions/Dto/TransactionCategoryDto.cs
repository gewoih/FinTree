using FinTree.Domain.Categories;

namespace FinTree.Application.Transactions.Dto;

public readonly record struct TransactionCategoryDto(
    Guid Id,
    string Name,
    string Color,
    string Icon,
    bool IsSystem,
    CategoryType Type,
    bool IsMandatory);
