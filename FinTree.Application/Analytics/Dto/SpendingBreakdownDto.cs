using FinTree.Application.Currencies;

namespace FinTree.Application.Analytics.Dto;

public readonly record struct SpendingBreakdownDto(
    IReadOnlyList<MonthlyExpensesDto> Days,
    IReadOnlyList<MonthlyExpensesDto> Weeks,
    IReadOnlyList<MonthlyExpensesDto> Months);