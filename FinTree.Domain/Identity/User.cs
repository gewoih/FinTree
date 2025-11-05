using System.ComponentModel.DataAnnotations.Schema;
using FinTree.Domain.Accounts;
using FinTree.Domain.Categories;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;
using Microsoft.AspNetCore.Identity;
using Transaction = System.Transactions.Transaction;

namespace FinTree.Domain.Identity;

public sealed class User : IdentityUser<Guid>
{
    private readonly List<Account> _accounts = [];
    private readonly List<TransactionCategory> _transactionCategories = [];

    public string BaseCurrencyCode { get; private set; }
    public string? TelegramUserId { get; private set; }
    public Guid? MainAccountId { get; private set; }
    [NotMapped] public Currency BaseCurrency => Currency.FromCode(BaseCurrencyCode);
    public IReadOnlyCollection<Account> Accounts => _accounts;
    public IReadOnlyCollection<TransactionCategory> TransactionCategories => _transactionCategories;

    private User()
    {
    }

    public User(string username, string email, string baseCurrencyCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(username, nameof(username));
        ArgumentException.ThrowIfNullOrWhiteSpace(email, nameof(email));

        UserName = username;
        Email = email;
        SetBaseCurrency(baseCurrencyCode);
    }

    public void SetBaseCurrency(string currencyCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(currencyCode, nameof(currencyCode));

        BaseCurrencyCode = currencyCode;
    }

    public Account AddAccount(string currencyCode, AccountType type, string name)
    {
        var account = new Account(Id, name, currencyCode, type);
        _accounts.Add(account);

        return account;
    }

    public void SetMainAccount(Guid accountId)
    {
        var isAccountExists = _accounts.Any(a => a.Id == accountId);
        if (!isAccountExists)
            throw new InvalidOperationException("Счет не существует");

        MainAccountId = accountId;
    }

    public void LinkTelegramAccount(string telegramUserId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(telegramUserId, nameof(telegramUserId));

        TelegramUserId = telegramUserId.Trim();
    }

    public void UnlinkTelegramAccount()
    {
        TelegramUserId = null;
    }

    public TransactionCategory AddTransactionCategory(CategoryType categoryType, string name, string color)
    {
        if (_transactionCategories.Any(t =>
                string.Equals(t.Name, name, StringComparison.CurrentCultureIgnoreCase) &&
                t.Type == categoryType))
        {
            throw new InvalidOperationException("Категория уже существует");
        }

        var transactionCategory = TransactionCategory.CreateUser(Id, name, color, categoryType);
        _transactionCategories.Add(transactionCategory);
        return transactionCategory;
    }
}