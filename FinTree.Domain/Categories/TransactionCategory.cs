using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Base;

namespace FinTree.Domain.Categories;

public sealed class TransactionCategory : Entity
{
    public Guid? UserId { get; private set; }
    [MaxLength(50)] public string Name { get; private set; }
    [MaxLength(9)] public string Color { get; private set; }
    public CategoryType Type { get; private set; }
    public bool IsDefault { get; private set; }
    public bool IsSystem => UserId == null;

    private TransactionCategory(string name, string color, CategoryType type = CategoryType.Expense,
        bool isDefault = false, Guid? userId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(color);

        UserId = userId;
        Name = name.Trim();
        Color = color.Trim();
        Type = type;
        IsDefault = isDefault;
    }

    public static TransactionCategory CreateDefault(string name, string color, CategoryType type = CategoryType.Expense)
    {
        return new TransactionCategory(name, color, type, true);
    }

    public static TransactionCategory CreateSystem(string name, string color, CategoryType type = CategoryType.Expense)
    {
        return new TransactionCategory(name, color, type);
    }

    public static TransactionCategory CreateUser(Guid userId, string name, string color,
        CategoryType type = CategoryType.Expense)
    {
        return new TransactionCategory(name, color, type, false, userId);
    }

    public void Update(string? name = null, string? color = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(color);

        Name = name.Trim();
        Color = color.Trim();
    }
}