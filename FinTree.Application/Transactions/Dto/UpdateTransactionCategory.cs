using System.ComponentModel.DataAnnotations;

namespace FinTree.Application.Transactions.Dto;

public readonly record struct UpdateTransactionCategory(
    Guid Id,
    [property: Required, StringLength(50)] string Name,
    [property: Required, StringLength(9)] string Color,
    [property: Required, StringLength(20)] string Icon,
    bool? IsMandatory = null);
