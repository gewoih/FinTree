using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Accounts;
using FinTree.Domain.Base;
using FinTree.Domain.ValueObjects;

namespace FinTree.Domain.Transactions;

public sealed class Transaction : Entity
{
    public Account Account { get; private set; }
    public Guid AccountId { get; private set; }
    public Guid CategoryId { get; private set; }
    public Money Money { get; private set; }
    public TransactionType Type { get; private set; }
    public DateTime OccurredAt { get; private set; }
    public bool IsMandatory { get; private set; }
    public bool IsTransfer { get; private set; }
    public Guid? TransferId { get; private set; }
    [MaxLength(100)] public string? Description { get; private set; }

    private Transaction()
    {
    }

    internal Transaction(TransactionType type, Guid accountId, Guid categoryId, Money money, DateTime occurredAt,
        string? description = null, bool isMandatory = false, bool isTransfer = false, Guid? transferId = null)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(categoryId, Guid.Empty, nameof(categoryId));
        ArgumentOutOfRangeException.ThrowIfEqual(accountId, Guid.Empty, nameof(accountId));
        ArgumentOutOfRangeException.ThrowIfGreaterThan(occurredAt, DateTime.UtcNow, nameof(occurredAt));
        if (isTransfer && transferId is null)
            throw new ArgumentException("TransferId is required for transfer transactions.", nameof(transferId));

        Type = type;
        AccountId = accountId;
        CategoryId = categoryId;
        Money = money;
        OccurredAt = occurredAt;
        Description = description;
        IsMandatory = isMandatory;
        IsTransfer = isTransfer;
        TransferId = transferId;
    }

    public void AssignCategory(Guid categoryId)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(categoryId, Guid.Empty, nameof(categoryId));
        CategoryId = categoryId;
    }

    public void Update(Guid accountId, Guid categoryId, Money money, DateTime occurredAt, string? description,
        bool isMandatory)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(categoryId, Guid.Empty, nameof(categoryId));
        ArgumentOutOfRangeException.ThrowIfEqual(accountId, Guid.Empty, nameof(accountId));
        ArgumentOutOfRangeException.ThrowIfGreaterThan(occurredAt, DateTime.UtcNow, nameof(occurredAt));

        AccountId = accountId;
        CategoryId = categoryId;
        Money = money;
        OccurredAt = occurredAt;
        Description = description;
        IsMandatory = isMandatory;
    }
}
