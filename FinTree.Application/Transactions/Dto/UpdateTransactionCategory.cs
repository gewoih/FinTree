namespace FinTree.Application.Transactions.Dto;

public readonly record struct UpdateTransactionCategory(Guid Id, string? Name, string? Color, string Icon,
    bool? IsMandatory = null);
