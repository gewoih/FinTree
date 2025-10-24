using FinTree.Domain.Accounts;

namespace FinTree.Application.Accounts;

public readonly record struct CreateAccount(Guid UserId, Guid CurrencyId, AccountType Type, string Name);