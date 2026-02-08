using System.ComponentModel.DataAnnotations.Schema;
using FinTree.Domain.Accounts;
using FinTree.Domain.Categories;
using FinTree.Domain.ValueObjects;
using Microsoft.AspNetCore.Identity;

namespace FinTree.Domain.Identity;

public sealed class User : IdentityUser<Guid>
{
    private readonly List<Account> _accounts = [];
    private readonly List<TransactionCategory> _transactionCategories = [];

    public string BaseCurrencyCode { get; private set; }
    public long? TelegramUserId { get; private set; }
    public Guid? MainAccountId { get; private set; }
    [NotMapped] public Currency BaseCurrency => Currency.FromCode(BaseCurrencyCode);
    public IReadOnlyCollection<Account> Accounts => _accounts;
    public IReadOnlyCollection<TransactionCategory> TransactionCategories => _transactionCategories;

    private User()
    {
    }

    public User(string username, string email, string baseCurrencyCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(username);
        ArgumentException.ThrowIfNullOrWhiteSpace(email);

        UserName = username;
        Email = email;
        SetBaseCurrency(baseCurrencyCode);
    }

    public void SetBaseCurrency(string currencyCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(currencyCode);

        BaseCurrencyCode = currencyCode;
    }

    public Account AddAccount(string currencyCode, AccountType type, string name, bool? isLiquid = null)
    {
        var resolvedIsLiquid = isLiquid ?? type == AccountType.Bank;
        var account = new Account(Id, name, currencyCode, type, resolvedIsLiquid);
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

    public void ClearMainAccount()
    {
        MainAccountId = null;
    }

    public void LinkTelegramAccount(long telegramUserId)
    {
        if (telegramUserId <= 0)
            throw new InvalidOperationException("Telegram user id must be positive.");

        TelegramUserId = telegramUserId;
    }

    public void UnlinkTelegramAccount()
    {
        TelegramUserId = null;
    }

    public TransactionCategory AddTransactionCategory(CategoryType categoryType, string name, string color, string icon,
        bool isMandatory = false)
    {
        if (_transactionCategories.Any(t =>
                string.Equals(t.Name, name, StringComparison.CurrentCultureIgnoreCase) &&
                t.Type == categoryType))
        {
            throw new InvalidOperationException("Категория уже существует");
        }

        var transactionCategory = TransactionCategory.CreateUser(Id, name, color, icon, categoryType, isMandatory);
        _transactionCategories.Add(transactionCategory);
        return transactionCategory;
    }
}
