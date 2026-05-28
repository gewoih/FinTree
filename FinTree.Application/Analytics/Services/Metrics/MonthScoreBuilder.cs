namespace FinTree.Application.Analytics.Services.Metrics;

public readonly record struct MonthScoreInputs(
    decimal MonthIncome,
    decimal MonthExpenses,
    decimal DiscretionaryTotal,
    decimal LiquidMonths);

public readonly record struct MonthScoreResult(
    decimal? SavingsRate,
    decimal? DiscretionarySharePercent,
    decimal? TotalMonthScore);

// Единая точка расчёта месячных метрик и общего скора. Используется и Dashboard, и Evolution,
// чтобы оба сервиса работали на идентичных формулах и порогах.
public static class MonthScoreBuilder
{
    public static MonthScoreResult Build(MonthScoreInputs inputs)
    {
        var savingsRate = inputs.MonthIncome > 0m
            ? (inputs.MonthIncome - inputs.MonthExpenses) / inputs.MonthIncome
            : (decimal?)null;

        var discretionaryShare = inputs.MonthExpenses > 0m
            ? inputs.DiscretionaryTotal / inputs.MonthExpenses * 100m
            : (decimal?)null;

        var totalScore = MonthlyScoreService.CalculateTotalMonthScore(
            savingsRate,
            inputs.LiquidMonths,
            discretionaryShare);

        return new MonthScoreResult(savingsRate, discretionaryShare, totalScore);
    }
}
