using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FinTree.Domain.Base;
using FinTree.Domain.Identity;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;

namespace FinTree.Domain.Accounts;

public sealed class Account : Entity
{
    private readonly List<Transaction> _transactions = [];

    [MaxLength(50)] public string Name { get; private set; }

    public Guid UserId { get; private set; }
    public User User { get; private set; }
    [MaxLength(3)] public string CurrencyCode { get; private set; }
    [NotMapped] public Currency Currency => Currency.FromCode(CurrencyCode);
    public AccountType Type { get; private set; }
    public bool IsArchived { get; private set; }
    public bool IsMain => User.MainAccountId == Id;
    public IReadOnlyCollection<Transaction> Transactions => _transactions.AsReadOnly();

    internal Account(Guid userId, string name, string currencyCode, AccountType type)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty, nameof(userId));
        ArgumentException.ThrowIfNullOrWhiteSpace(currencyCode, nameof(currencyCode));
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));

        UserId = userId;
        Name = name;
        CurrencyCode = currencyCode;
        Type = type;
        IsArchived = false;
    }

    public ExpenseTransaction AddExpense(Guid categoryId, decimal amount, DateTime occuredAt,
        string? description = null, bool isMandatory = false)
    {
        ValidateTransaction(categoryId);

        var money = new Money(CurrencyCode, amount);
        var transaction = new ExpenseTransaction(Id, categoryId, money, occuredAt, description, isMandatory);
        _transactions.Add(transaction);

        return transaction;
    }

    public IncomeTransaction AddIncome(Guid categoryId, decimal amount, DateTime occuredAt, string? description = null)
    {
        ValidateTransaction(categoryId);

        var money = new Money(CurrencyCode, amount);
        var transaction = new IncomeTransaction(Id, categoryId, money, occuredAt, description);
        _transactions.Add(transaction);

        return transaction;
    }

    private void ValidateTransaction(Guid categoryId)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(categoryId, Guid.Empty, nameof(categoryId));
        if (IsArchived)
            throw new InvalidOperationException("Невозможно добавить транзакцию в заархивированный счет.");
    }

    public void Archive() => IsArchived = true;
    public void Unarchive() => IsArchived = false;
}