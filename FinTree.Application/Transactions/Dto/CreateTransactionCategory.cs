using FinTree.Domain.Categories;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Transactions.Dto;

public readonly record struct CreateTransactionCategory(CategoryType CategoryType, string Name, string Color,
    string Icon, bool IsMandatory = false);
