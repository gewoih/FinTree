namespace FinTree.Application.Goals.Dto;

public sealed record GoalSimulationResultDto(
    double Probability,
    int MedianMonths,
    int P25Months,
    int P75Months,
    GoalPercentilePathsDto PercentilePaths,
    GoalSimulationParametersDto ResolvedParameters,
    IReadOnlyList<string> Insights,
    bool IsAchievable,
    IReadOnlyList<string> MonthLabels);

public sealed record GoalPercentilePathsDto(
    IReadOnlyList<decimal> P10,
    IReadOnlyList<decimal> P20,
    IReadOnlyList<decimal> P40,
    IReadOnlyList<decimal> P50,
    IReadOnlyList<decimal> P60,
    IReadOnlyList<decimal> P80,
    IReadOnlyList<decimal> P90);

public sealed record GoalSimulationParametersDto(
    decimal InitialCapital,
    decimal MonthlyIncome,
    decimal MonthlyExpenses,
    decimal AnnualReturnRate,
    bool IsCapitalFromAnalytics,
    bool IsIncomeFromAnalytics,
    bool IsExpensesFromAnalytics);
