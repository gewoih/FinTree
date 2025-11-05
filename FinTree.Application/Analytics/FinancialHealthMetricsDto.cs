namespace FinTree.Application.Analytics;

public readonly record struct FinancialHealthMetricsDto(
    int PeriodMonths,
    decimal? SavingsRate,
    decimal? LiquidityMonths,
    decimal? ExpenseVolatility,
    decimal? IncomeDiversity);
