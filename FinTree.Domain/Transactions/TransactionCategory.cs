using FinTree.Domain.Base;

namespace FinTree.Domain.Transactions;

public sealed class TransactionCategory : Entity
{
    public Guid UserId { get; set; }
    public required string Name { get; set; }
    public required string Color { get; set; }
    public bool IsDefault { get; set; }
}