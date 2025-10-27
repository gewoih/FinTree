using FinTree.Domain.Accounts;

namespace FinTree.Application.Accounts;

public readonly record struct AccountDto(Guid Id, Guid CurrencyId, string Name, AccountType Type, bool IsMain);