namespace FinTree.Application.Transactions.Dto;

public readonly record struct CreateTransactionCategory(Guid UserId, string Name, string Color);