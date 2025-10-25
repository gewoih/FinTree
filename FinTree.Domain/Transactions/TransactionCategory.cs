using FinTree.Domain.Base;

namespace FinTree.Domain.Transactions;

public sealed class TransactionCategory : Entity
{
    public Guid? UserId { get; private set; }
    public string Name { get; private set; }
    public string Color { get; private set; }
    public bool IsDefault { get; private set; }
    public bool IsSystem => UserId == null;

    private TransactionCategory(string name, string color, bool isDefault = false, Guid? userId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(color);

        UserId = userId;
        Name = name;
        Color = color;
        IsDefault = isDefault;
    }

    public static TransactionCategory CreateDefault(string name, string color)
    {
        return new TransactionCategory(name, color, true);
    }
    
    public static TransactionCategory CreateSystem(string name, string color)
    {
        return new TransactionCategory(name, color);
    }

    public static TransactionCategory CreateUser(Guid userId, string name, string color)
    {
        return new TransactionCategory(name, color, false, userId);
    }
}