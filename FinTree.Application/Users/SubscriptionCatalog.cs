using FinTree.Domain.Subscriptions;

namespace FinTree.Application.Users;

public static class SubscriptionCatalog
{
    public const decimal MonthPriceRub = 390m;
    public const decimal YearPriceRub = 3900m;
    public const int SimulatedGrantedMonths = 1;

    public static decimal ResolvePriceRub(SubscriptionPlan plan)
    {
        return plan switch
        {
            SubscriptionPlan.Month => MonthPriceRub,
            SubscriptionPlan.Year => YearPriceRub,
            _ => throw new ArgumentOutOfRangeException(nameof(plan), plan, "Unknown subscription plan.")
        };
    }

    public static int ResolveBillingPeriodMonths(SubscriptionPlan plan)
    {
        return plan switch
        {
            SubscriptionPlan.Month => 1,
            SubscriptionPlan.Year => 12,
            _ => throw new ArgumentOutOfRangeException(nameof(plan), plan, "Unknown subscription plan.")
        };
    }
}
