using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Accounts;
using FinTree.Domain.Base;

namespace FinTree.Domain.Transactions;

public abstract class Transaction : Entity
{
    public Account Account { get; private set; }
    public Guid AccountId { get; private set; }
    public Guid CategoryId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime OccurredAt { get; private set; }
    [MaxLength(100)] public string? Description { get; private set; }
    
    public Guid CurrencyId => Account.CurrencyId;

    protected internal Transaction(Guid accountId, Guid categoryId, decimal amount, DateTime occurredAt,
        string? description = null)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(amount, nameof(amount));
        ArgumentOutOfRangeException.ThrowIfEqual(categoryId, Guid.Empty, nameof(categoryId));
        ArgumentOutOfRangeException.ThrowIfEqual(accountId, Guid.Empty, nameof(accountId));
        ArgumentOutOfRangeException.ThrowIfGreaterThan(occurredAt, DateTime.UtcNow, nameof(occurredAt));

        AccountId = accountId;
        CategoryId = categoryId;
        Amount = amount;
        OccurredAt = occurredAt;
        Description = description;
    }

    public void AssignCategory(Guid categoryId)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(categoryId, Guid.Empty, nameof(categoryId));
        CategoryId = categoryId;
    }
}