using FinTree.Domain.Base;
using FinTree.Domain.Currencies;
using FinTree.Domain.Identity;
using FinTree.Domain.Transactions;

namespace FinTree.Domain.Accounts;

public sealed class Account : Entity
{
    private readonly List<Transaction> _transactions = [];
    
    public string Name { get; private set; }
    public Guid UserId { get; private set; }
    public Guid CurrencyId { get; private set; }
    public Currency Currency { get; private set; }
    public AccountType Type { get; private set; }
    public bool IsArchived { get; private set; }
    public IReadOnlyCollection<Transaction> Transactions => _transactions.AsReadOnly();

    private Account()
    {
    }

    internal Account(Guid userId, string name, Guid currencyId, AccountType type)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty, nameof(userId));
        ArgumentOutOfRangeException.ThrowIfEqual(currencyId, Guid.Empty, nameof(currencyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));

        Id = Guid.NewGuid();
        UserId = userId;
        Name = name;
        CurrencyId = currencyId;
        Type = type;
        IsArchived = false;
    }

    public ExpenseTransaction AddExpense(Guid categoryId, decimal amount, DateTime occuredAt,
        string? description = null, bool isMandatory = false)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(categoryId, Guid.Empty, nameof(categoryId));
        if (IsArchived)
            throw new InvalidOperationException("Невозможно добавить транзакцию в заархивированный счет.");

        var transaction = new ExpenseTransaction(Id, categoryId, amount, occuredAt, description, isMandatory);
        _transactions.Add(transaction);

        return transaction;
    }

    public void Archive() => IsArchived = true;
    public void Unarchive() => IsArchived = false;
}