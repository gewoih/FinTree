namespace FinTree.Application.Currencies;

public readonly record struct MonthlyExpensesDto(int Year, int Month, int? Day, int? Week, decimal Amount);
