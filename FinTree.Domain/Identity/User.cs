using FinTree.Domain.Base;
using FinTree.Domain.Transactions;

namespace FinTree.Domain.Identity;

public sealed class User : Entity
{
    public required Currency.Currency BaseCurrency { get; set; }
    public string? TelegramUserId { get; set; }
    public ICollection<TransactionCategory>? TransactionCategories { get; set; }
}