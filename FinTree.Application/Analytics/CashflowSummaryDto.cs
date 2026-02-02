namespace FinTree.Application.Analytics;

public readonly record struct CashflowSummaryDto(
    int Year,
    int Month,
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal NetCashflow,
    decimal? SavingsRate);
