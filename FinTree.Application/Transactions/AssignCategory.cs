namespace FinTree.Application.Transactions;

public readonly record struct AssignCategory(Guid TransactionId, Guid CategoryId);