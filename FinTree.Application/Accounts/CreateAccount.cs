using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Accounts;

namespace FinTree.Application.Accounts;

public readonly record struct CreateAccount(
    [property: Required, StringLength(5)] string CurrencyCode,
    AccountType Type,
    [property: Required, StringLength(50)] string Name,
    decimal InitialBalance = 0m,
    bool? IsLiquid = null);
