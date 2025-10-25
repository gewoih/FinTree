namespace FinTree.Application.Transactions.Dto;

public readonly record struct AssignCategory(Guid TransactionId, Guid CategoryId);