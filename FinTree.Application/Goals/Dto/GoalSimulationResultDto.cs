namespace FinTree.Application.Goals.Dto;

public sealed record GoalSimulationResultDto(
    double Probability,
    double DataQualityScore,
    int MedianMonths,
    int P25Months,
    int P75Months,
    GoalPercentilePathsDto PercentilePaths,
    GoalSimulationParametersDto ResolvedParameters,
    bool IsAchievable,
    IReadOnlyList<string> MonthLabels);

public sealed record GoalPercentilePathsDto(
    IReadOnlyList<decimal> P25,
    IReadOnlyList<decimal> P50,
    IReadOnlyList<decimal> P75);

public sealed record GoalSimulationParametersDto(
    decimal InitialCapital,
    decimal MonthlyIncome,
    decimal MonthlyExpenses,
    decimal AnnualReturnRate,
    bool IsCapitalFromAnalytics,
    bool IsIncomeFromAnalytics,
    bool IsExpensesFromAnalytics);
