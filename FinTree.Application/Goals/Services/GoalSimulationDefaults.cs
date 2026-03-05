namespace FinTree.Application.Goals.Services;

public static class GoalSimulationDefaults
{
    public const int HistoryWindowDays = 180;
    public const int BootstrapBlockDays = 7;

    // Forecast is short-term, so recency can be more aggressive.
    // λ=0.02 corresponds to approximately 35 days half-life.
    public const double ForecastRecencyLambda = 0.02d;
    // Goal simulation is long-term, so use slower recency decay.
    // λ=0.008 corresponds to approximately 87 days half-life.
    public const double GoalRecencyLambda = 0.008d;

    public const int MinSimulations = 5_000;
    public const int MaxSimulations = 10_000;
    public const int BatchSize = 500;

    public const int MaxHorizonYears = 30;

    public const double ConvergenceProbDelta = 0.003d;
    public const int ConvergenceMedianDeltaDays = 10;
    public const int ConvergenceStableBatches = 3;

    public const double QualityFactorMin = 0.70d;
    public const int QualityFactorFullHistoryDays = 365;

    public const int DaysInYear = 365;
    public const decimal AverageDaysInMonth = 30.44m;

    public const int GoalDeterministicSeedBase = 97;
    public const int ForecastDeterministicSeedBase = 42;
    public const int SeedPoolSamples = 64;

    public const int SyntheticExpensePoolSize = 180;
    public const int SyntheticSeedBase = 13_337;
    public const int SyntheticIncomeSeedOffset = 7_919;
    public const int SyntheticWeekLengthDays = 7;
    public const int SyntheticWeekendStartIndex = 5;
    public const int SyntheticWeekendEndIndex = 6;
    public const decimal SyntheticExpenseNoiseLevel = 0.25m;
    public const decimal SyntheticWeekendExpenseBoost = 0.05m;
    public const decimal SyntheticExpenseFactorMin = 0.45m;
    public const decimal SyntheticExpenseFactorMax = 1.75m;
    public const decimal SyntheticIncomeNoiseLevel = 0.18m;
    public const decimal SyntheticIncomeFactorMin = 0.60m;
    public const decimal SyntheticIncomeFactorMax = 1.40m;
    public const decimal ExpenseMinRelativeStdDevForHistoryPool = 0.03m;
    public const decimal IncomeMinRelativeStdDevForHistoryPool = 0.015m;

    public const double ExpenseWinsorizeLowerQuantile = 0.05d;
    public const double ExpenseWinsorizeUpperQuantile = 0.95d;
    public const double IncomeWinsorizeLowerQuantile = 0.01d;
    public const double IncomeWinsorizeUpperQuantile = 0.99d;

    public const double QuantileP25 = 0.25d;
    public const double QuantileP50 = 0.50d;
    public const double QuantileP75 = 0.75d;

    public const double DailyReturnFloor = -0.95d;
    public const double AnnualReturnFloorForDailyConversion = -0.999d;
    public const double AnnualVolatilityBase = 0.12d;
    public const double AnnualVolatilityReturnSensitivity = 0.40d;
    public const double AnnualVolatilityFloor = 0.08d;
    public const double AnnualVolatilityCap = 0.45d;
}
