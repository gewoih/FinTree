using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Base;

namespace FinTree.Domain.Retrospectives;

public sealed class MonthlyRetrospective : Entity
{
    public Guid UserId { get; private set; }

    public DateOnly MonthDate { get; private set; }

    public DateTimeOffset? BannerDismissedAt { get; private set; }

    [MaxLength(2000)]
    public string? Conclusion { get; private set; }

    [MaxLength(2000)]
    public string? NextMonthPlan { get; private set; }

    [MaxLength(1000)]
    public string? Wins { get; private set; }

    [MaxLength(2000)]
    public string? SavingsOpportunities { get; private set; }

    public int? DisciplineRating { get; private set; }
    public int? ImpulseControlRating { get; private set; }
    public int? ConfidenceRating { get; private set; }

    private MonthlyRetrospective()
    {
    }

    public static MonthlyRetrospective Create(Guid userId, DateOnly monthDate)
    {
        return new MonthlyRetrospective
        {
            UserId = userId,
            MonthDate = monthDate,
        };
    }

    public void DismissBanner()
    {
        BannerDismissedAt = DateTimeOffset.UtcNow;
    }

    public void Update(
        string? conclusion,
        string? nextMonthPlan,
        string? wins,
        string? savingsOpportunities,
        int? disciplineRating,
        int? impulseControlRating,
        int? confidenceRating)
    {
        Conclusion = NormalizeText(conclusion);
        NextMonthPlan = NormalizeText(nextMonthPlan);
        Wins = NormalizeText(wins);
        SavingsOpportunities = NormalizeText(savingsOpportunities);
        DisciplineRating = disciplineRating;
        ImpulseControlRating = impulseControlRating;
        ConfidenceRating = confidenceRating;
    }

    private static string? NormalizeText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return value.Trim();
    }
}
