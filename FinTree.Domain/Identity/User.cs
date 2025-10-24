using FinTree.Domain.Accounts;
using FinTree.Domain.Base;
using FinTree.Domain.Currencies;
using FinTree.Domain.Transactions;

namespace FinTree.Domain.Identity;

public sealed class User : Entity
{
    private readonly List<Account> _accounts = [];
    private readonly List<TransactionCategory> _transactionCategories = [];
    
    public Guid BaseCurrencyId { get; private set; }
    public Currency BaseCurrency { get; private set; }
    public string? TelegramUserId { get; private set; }
    public Guid? MainAccountId { get; private set; }
    public IReadOnlyCollection<Account> Accounts => _accounts;
    public IReadOnlyCollection<TransactionCategory> TransactionCategories => _transactionCategories;

    public Account AddAccount(Guid currencyId, AccountType type, string name)
    {
        var account = new Account(Id, name, currencyId, type);
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
}