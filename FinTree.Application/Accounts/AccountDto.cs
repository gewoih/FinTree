using FinTree.Domain.Accounts;

namespace FinTree.Application.Accounts;

public readonly record struct AccountDto(
    Guid Id,
    string CurrencyCode,
    string Name,
    AccountType Type,
    bool IsLiquid,
    bool IsMain,
    decimal Balance,
    decimal BalanceInBaseCurrency);
