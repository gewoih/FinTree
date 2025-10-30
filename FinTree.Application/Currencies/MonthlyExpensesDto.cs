namespace FinTree.Application.Currencies;

public readonly record struct MonthlyExpensesDto(int Year, int Month, decimal Amount);