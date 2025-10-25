using FinTree.Domain.Accounts;

namespace FinTree.Application.Accounts;

public readonly record struct AccountDto(Guid Id, string Name, AccountType Type);