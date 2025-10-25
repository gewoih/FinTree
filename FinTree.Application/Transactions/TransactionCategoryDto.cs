namespace FinTree.Application.Transactions;

public readonly record struct TransactionCategoryDto(Guid Id, string Name, string Color, bool IsSystem);