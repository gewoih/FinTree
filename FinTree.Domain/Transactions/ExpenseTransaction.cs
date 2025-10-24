namespace FinTree.Domain.Transactions;

public sealed class ExpenseTransaction : Transaction
{
    public bool IsMandatory { get; private set; }

    private ExpenseTransaction()
    {
    }

    internal ExpenseTransaction(Guid accountId,
        Guid categoryId,
        decimal amount,
        DateTime occurredAt,
        string? description = null,
        bool isMandatory = false) : base(accountId, categoryId, amount, occurredAt,
        description)
    {
        IsMandatory = isMandatory;
    }
}