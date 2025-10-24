namespace FinTree.Application.Transactions;

public sealed record TxFilter(
    Guid? AccountId,
    DateOnly? From,
    DateOnly? To,
    string? Search,
    int Page = 1,
    int Size = 50);