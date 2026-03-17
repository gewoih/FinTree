namespace FinTree.Application.Transactions.Dto;

public sealed record TxFilter(
    Guid? AccountId,
    Guid? CategoryId,
    DateOnly? From,
    DateOnly? To,
    string? Search,
    bool? IsMandatory = null,
    int Page = 1,
    int Size = 50);
