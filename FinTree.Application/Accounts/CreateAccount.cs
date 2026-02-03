using FinTree.Domain.Accounts;

namespace FinTree.Application.Accounts;

public readonly record struct CreateAccount(string CurrencyCode, AccountType Type, string Name, decimal InitialBalance = 0m);
