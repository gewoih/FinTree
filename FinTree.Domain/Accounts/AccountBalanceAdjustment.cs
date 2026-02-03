using FinTree.Domain.Base;

namespace FinTree.Domain.Accounts;

public sealed class AccountBalanceAdjustment : Entity
{
    public Guid AccountId { get; private set; }
    public Account Account { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime OccurredAt { get; private set; }

    private AccountBalanceAdjustment()
    {
    }

    public AccountBalanceAdjustment(Account account, decimal amount, DateTime occurredAt)
    {
        Account = account ?? throw new ArgumentNullException(nameof(account));
        AccountId = account.Id;
        Amount = amount;
        OccurredAt = NormalizeDate(occurredAt);
    }

    public AccountBalanceAdjustment(Guid accountId, decimal amount, DateTime occurredAt)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(accountId, Guid.Empty, nameof(accountId));
        AccountId = accountId;
        Amount = amount;
        OccurredAt = NormalizeDate(occurredAt);
    }

    private static DateTime NormalizeDate(DateTime value)
    {
        if (value.Kind == DateTimeKind.Unspecified)
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return value.ToUniversalTime();
    }
}
