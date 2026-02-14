using System.ComponentModel.DataAnnotations.Schema;
using FinTree.Domain.Accounts;
using FinTree.Domain.Categories;
using FinTree.Domain.Subscriptions;
using FinTree.Domain.ValueObjects;
using Microsoft.AspNetCore.Identity;

namespace FinTree.Domain.Identity;

public sealed class User : IdentityUser<Guid>
{
    private const int TrialMonths = 1;
    private readonly List<Account> _accounts = [];
    private readonly List<TransactionCategory> _transactionCategories = [];
    private readonly List<RefreshToken> _refreshTokens = [];
    private readonly List<SubscriptionPayment> _subscriptionPayments = [];

    public string BaseCurrencyCode { get; private set; }
    public long? TelegramUserId { get; private set; }
    public Guid? MainAccountId { get; private set; }
    public DateTime? OnboardingSkippedAtUtc { get; private set; }
    public DateTime? SubscriptionActivatedAtUtc { get; private set; }
    public DateTime? SubscriptionExpiresAtUtc { get; private set; }
    [NotMapped] public Currency BaseCurrency => Currency.FromCode(BaseCurrencyCode);
    public IReadOnlyCollection<Account> Accounts => _accounts;
    public IReadOnlyCollection<TransactionCategory> TransactionCategories => _transactionCategories;
    public IReadOnlyCollection<RefreshToken> RefreshTokens => _refreshTokens;
    public IReadOnlyCollection<SubscriptionPayment> SubscriptionPayments => _subscriptionPayments;

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

    public bool HasActiveSubscription(DateTime utcNow)
    {
        var now = EnsureUtc(utcNow, nameof(utcNow));
        return SubscriptionExpiresAtUtc is { } expiresAtUtc && expiresAtUtc > now;
    }

    public void GrantTrialSubscription(DateTime grantedAtUtc)
    {
        ActivateSubscription(grantedAtUtc, TrialMonths);
    }

    public (DateTime StartsAtUtc, DateTime ExpiresAtUtc) ActivateSubscription(DateTime activatedAtUtc, int months)
    {
        if (months <= 0)
            throw new ArgumentOutOfRangeException(nameof(months), "Subscription duration must be positive.");

        var activatedAt = EnsureUtc(activatedAtUtc, nameof(activatedAtUtc));
        var startAt = SubscriptionExpiresAtUtc is { } expiresAtUtc && expiresAtUtc > activatedAt
            ? expiresAtUtc
            : activatedAt;
        var expiresAt = startAt.AddMonths(months);
        SetSubscriptionPeriod(startAt, expiresAt);
        return (startAt, expiresAt);
    }

    public void SetBaseCurrency(string currencyCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(currencyCode);

        var normalizedCurrencyCode = currencyCode.Trim().ToUpperInvariant();
        if (!Currency.TryFromCode(normalizedCurrencyCode, out _))
            throw new ArgumentException("Неизвестный код валюты.", nameof(currencyCode));

        BaseCurrencyCode = normalizedCurrencyCode;
    }

    public Account AddAccount(string currencyCode, AccountType type, string name, bool? isLiquid = null)
    {
        var resolvedIsLiquid = isLiquid ?? type == AccountType.Bank;
        var account = new Account(Id, name, currencyCode, type, resolvedIsLiquid);
        _accounts.Add(account);
        if (MainAccountId is null)
            MainAccountId = account.Id;

        return account;
    }

    public void SetMainAccount(Guid accountId)
    {
        var isAccountExists = _accounts.Any(a => a.Id == accountId && !a.IsArchived);
        if (!isAccountExists)
            throw new InvalidOperationException("Счет не существует или находится в архиве");

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

    public void SkipOnboarding()
    {
        OnboardingSkippedAtUtc = DateTime.UtcNow;
    }

    public void ResetOnboarding()
    {
        OnboardingSkippedAtUtc = null;
    }

    public bool EnsureMainAccountAssigned(bool assumeAccountsCollectionIsComplete = false)
    {
        if (MainAccountId.HasValue)
        {
            if (!assumeAccountsCollectionIsComplete)
                return false;

            var hasValidMainAccount = _accounts.Any(a => a.Id == MainAccountId && !a.IsArchived);
            if (hasValidMainAccount)
                return false;
        }

        var fallbackMainAccountId = _accounts
            .Where(a => !a.IsArchived)
            .OrderBy(a => a.CreatedAt)
            .Select(a => (Guid?)a.Id)
            .FirstOrDefault();

        if (fallbackMainAccountId == MainAccountId)
            return false;

        MainAccountId = fallbackMainAccountId;
        return true;
    }

    private void SetSubscriptionPeriod(DateTime activatedAtUtc, DateTime expiresAtUtc)
    {
        SubscriptionActivatedAtUtc = EnsureUtc(activatedAtUtc, nameof(activatedAtUtc));
        SubscriptionExpiresAtUtc = EnsureUtc(expiresAtUtc, nameof(expiresAtUtc));
    }

    private static DateTime EnsureUtc(DateTime value, string paramName)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => throw new ArgumentException("DateTime must contain timezone information.", paramName)
        };
    }
}
