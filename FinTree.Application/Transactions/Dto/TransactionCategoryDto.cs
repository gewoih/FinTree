using FinTree.Domain.Categories;

namespace FinTree.Application.Transactions.Dto;

public readonly record struct TransactionCategoryDto(
    Guid Id,
    string Name,
    string Color,
    string Icon,
    CategoryType Type,
    bool IsMandatory);
