using FinTree.Domain.Accounts;

namespace FinTree.Application.Accounts;

public readonly record struct CreateAccount(Guid UserId, string CurrencyCode, AccountType Type, string Name);