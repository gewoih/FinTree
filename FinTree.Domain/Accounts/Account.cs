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
    public bool IsMain => User.MainAccountId == Id;
    public IReadOnlyCollection<Transaction> Transactions => _transactions.AsReadOnly();

    internal Account(Guid userId, string name, string currencyCode, AccountType type)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty);
        ArgumentException.ThrowIfNullOrWhiteSpace(currencyCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        UserId = userId;
        Name = name;
        CurrencyCode = currencyCode;
        Type = type;
    }

    public Transaction AddTransaction(TransactionType type, Guid categoryId, decimal amount, DateTime occuredAt,
        string? description = null, bool isMandatory = false, bool isTransfer = false, Guid? transferId = null)
    {
        ValidateTransaction(categoryId);

        var money = new Money(CurrencyCode, amount);
        var transaction = new Transaction(type, Id, categoryId, money, occuredAt, description, isMandatory, isTransfer,
            transferId);
        _transactions.Add(transaction);

        return transaction;
    }

    private static void ValidateTransaction(Guid categoryId)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(categoryId, Guid.Empty);
    }
}
