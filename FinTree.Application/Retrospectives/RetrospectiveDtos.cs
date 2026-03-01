namespace FinTree.Application.Retrospectives;

public sealed record RetrospectiveListItemDto(
    string Month,
    int? DisciplineRating,
    int? ImpulseControlRating,
    int? ConfidenceRating,
    string? ConclusionPreview,
    string? WinsPreview,
    bool HasContent
);

public sealed record RetrospectiveDto(
    string Month,
    DateTimeOffset? BannerDismissedAt,
    string? Conclusion,
    string? NextMonthPlan,
    string? Wins,
    string? SavingsOpportunities,
    int? DisciplineRating,
    int? ImpulseControlRating,
    int? ConfidenceRating
);

public sealed record UpsertRetrospectiveCommand(
    string Month,
    string? Conclusion,
    string? NextMonthPlan,
    string? Wins,
    string? SavingsOpportunities,
    int? DisciplineRating,
    int? ImpulseControlRating,
    int? ConfidenceRating
);
