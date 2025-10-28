using FinTree.Domain.ValueObjects;

namespace FinTree.Domain.Transactions;

public sealed class ExpenseTransaction : Transaction
{
    public bool IsMandatory { get; private set; }

    internal ExpenseTransaction(Guid accountId,
        Guid categoryId,
        Money money,
        DateTime occurredAt,
        string? description = null,
        bool isMandatory = false) : base(accountId, categoryId, money, occurredAt,
        description)
    {
        IsMandatory = isMandatory;
    }
    
    private ExpenseTransaction() {}
}