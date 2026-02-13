using FinTree.Domain.Identity;

namespace FinTree.Domain.Subscriptions;

public sealed class SubscriptionPayment
{
    private const int ProviderMaxLength = 50;
    private const int ExternalPaymentIdMaxLength = 120;
    private const int MetadataMaxLength = 4000;

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public User User { get; private set; } = null!;
    public SubscriptionPlan Plan { get; private set; }
    public SubscriptionPaymentStatus Status { get; private set; }
    public decimal ListedPriceRub { get; private set; }
    public decimal ChargedPriceRub { get; private set; }
    public int BillingPeriodMonths { get; private set; }
    public int GrantedMonths { get; private set; }
    public bool IsSimulation { get; private set; }
    public DateTime PaidAtUtc { get; private set; }
    public DateTime SubscriptionStartsAtUtc { get; private set; }
    public DateTime SubscriptionEndsAtUtc { get; private set; }
    public string? Provider { get; private set; }
    public string? ExternalPaymentId { get; private set; }
    public string? MetadataJson { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private SubscriptionPayment()
    {
    }

    public static SubscriptionPayment CreateSucceeded(
        Guid userId,
        SubscriptionPlan plan,
        decimal listedPriceRub,
        decimal chargedPriceRub,
        int billingPeriodMonths,
        int grantedMonths,
        DateTime paidAtUtc,
        DateTime subscriptionStartsAtUtc,
        DateTime subscriptionEndsAtUtc,
        bool isSimulation,
        string? provider = null,
        string? externalPaymentId = null,
        string? metadataJson = null)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty);
        ArgumentOutOfRangeException.ThrowIfNegative(listedPriceRub);
        ArgumentOutOfRangeException.ThrowIfNegative(chargedPriceRub);
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(billingPeriodMonths, 0);
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(grantedMonths, 0);

        var paidAt = EnsureUtc(paidAtUtc, nameof(paidAtUtc));
        var startsAt = EnsureUtc(subscriptionStartsAtUtc, nameof(subscriptionStartsAtUtc));
        var endsAt = EnsureUtc(subscriptionEndsAtUtc, nameof(subscriptionEndsAtUtc));
        if (endsAt <= startsAt)
            throw new ArgumentOutOfRangeException(nameof(subscriptionEndsAtUtc),
                "Subscription end must be greater than start.");

        return new SubscriptionPayment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Plan = plan,
            Status = SubscriptionPaymentStatus.Succeeded,
            ListedPriceRub = listedPriceRub,
            ChargedPriceRub = chargedPriceRub,
            BillingPeriodMonths = billingPeriodMonths,
            GrantedMonths = grantedMonths,
            IsSimulation = isSimulation,
            PaidAtUtc = paidAt,
            SubscriptionStartsAtUtc = startsAt,
            SubscriptionEndsAtUtc = endsAt,
            Provider = TrimOrNull(provider, ProviderMaxLength),
            ExternalPaymentId = TrimOrNull(externalPaymentId, ExternalPaymentIdMaxLength),
            MetadataJson = TrimOrNull(metadataJson, MetadataMaxLength),
            CreatedAtUtc = DateTime.UtcNow
        };
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

    private static string? TrimOrNull(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var normalized = value.Trim();
        if (normalized.Length > maxLength)
            throw new ArgumentOutOfRangeException(nameof(value), $"Value exceeds max length of {maxLength}.");

        return normalized;
    }
}
