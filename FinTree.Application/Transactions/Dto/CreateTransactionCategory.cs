using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Categories;

namespace FinTree.Application.Transactions.Dto;

public readonly record struct CreateTransactionCategory(
    CategoryType CategoryType,
    [property: Required, StringLength(50)] string Name,
    [property: Required, StringLength(9)] string Color,
    [property: Required, StringLength(20)] string Icon,
    bool IsMandatory = false);
