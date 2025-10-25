namespace FinTree.Application.Transactions;

public readonly record struct CreateTransactionCategory(Guid UserId, string Name, string Color);