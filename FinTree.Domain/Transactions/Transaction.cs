using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Accounts;
using FinTree.Domain.Base;
using FinTree.Domain.ValueObjects;

namespace FinTree.Domain.Transactions;

public sealed class Transaction : Entity
{
    public Account Account { get; private set; }
    public Guid AccountId { get; private set; }
    public Guid? CategoryId { get; private set; }
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

    internal Transaction(TransactionType type, Guid accountId, Guid? categoryId, Money money, DateTime occurredAt,
        string? description = null, bool isMandatory = false, bool isTransfer = false, Guid? transferId = null)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(accountId, Guid.Empty, nameof(accountId));
        ArgumentOutOfRangeException.ThrowIfGreaterThan(occurredAt, DateTime.UtcNow.AddHours(14), nameof(occurredAt));
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

    public void AssignCategory(Guid? categoryId)
    {
        CategoryId = categoryId;
    }

    public void MoveToAccount(Account newAccount)
    {
        if (newAccount.UserId != Account.UserId)
            throw new InvalidOperationException("Нельзя перемещать транзакцию в счёт другого пользователя.");
        if (newAccount.IsArchived)
            throw new InvalidOperationException("Нельзя перемещать транзакцию в архивный счёт.");

        AccountId = newAccount.Id;
        Account = newAccount;
        Money = new Money(newAccount.CurrencyCode, Money.Amount);
    }

    public void Update(Guid? categoryId, Money money, DateTime occurredAt, string? description, bool isMandatory)
    {
        ArgumentOutOfRangeException.ThrowIfGreaterThan(occurredAt, DateTime.UtcNow.AddHours(14), nameof(occurredAt));

        if (money.Currency.Code != Account.CurrencyCode)
            throw new InvalidOperationException(
                $"Валюта транзакции ({money.Currency.Code}) не совпадает с валютой счёта ({Account.CurrencyCode}).");

        CategoryId = categoryId;
        Money = money;
        OccurredAt = occurredAt;
        Description = description;
        IsMandatory = isMandatory;
    }
}
