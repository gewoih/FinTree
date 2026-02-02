namespace FinTree.Application.Transactions.Dto;

public readonly record struct UpdateTransactionCategory(Guid Id, string? Name, string? Color,
    bool? IsMandatory = null);
