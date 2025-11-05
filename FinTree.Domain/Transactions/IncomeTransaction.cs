using FinTree.Domain.ValueObjects;

namespace FinTree.Domain.Transactions;

public sealed class IncomeTransaction : Transaction
{
    internal IncomeTransaction(Guid accountId,
        Guid categoryId,
        Money money,
        DateTime occurredAt,
        string? description = null) : base(accountId, categoryId, money, occurredAt, description)
    {
    }
    
    public void UpdateIncome(Guid accountId, Guid categoryId, Money money, DateTime occurredAt, string? description)
    {
        Update(accountId, categoryId, money, occurredAt, description);
    }    
}