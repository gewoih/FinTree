using FinTree.Domain.Accounts;

namespace FinTree.Application.Accounts;

public readonly record struct InvestmentAccountOverviewDto(
    Guid Id,
    string Name,
    string CurrencyCode,
    AccountType Type,
    bool IsLiquid,
    decimal Balance,
    decimal BalanceInBaseCurrency,
    DateTime? LastAdjustedAt,
    decimal? ReturnPercent);

public readonly record struct InvestmentsOverviewDto(
    DateTime PeriodFrom,
    DateTime PeriodTo,
    decimal TotalValueInBaseCurrency,
    decimal LiquidValueInBaseCurrency,
    decimal? TotalReturnPercent,
    IReadOnlyList<InvestmentAccountOverviewDto> Accounts);
