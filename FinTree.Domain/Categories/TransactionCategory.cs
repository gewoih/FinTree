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
    public bool IsMandatory { get; private set; }
    public bool IsSystem => UserId == null;

    private TransactionCategory(string name, string color, CategoryType type = CategoryType.Expense,
        bool isDefault = false, Guid? userId = null, bool isMandatory = false)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(color);

        UserId = userId;
        Name = name.Trim();
        Color = color.Trim();
        Type = type;
        IsDefault = isDefault;
        IsMandatory = isMandatory;
    }

    public static TransactionCategory CreateDefault(string name, string color, CategoryType type = CategoryType.Expense,
        bool isMandatory = false)
    {
        return new TransactionCategory(name, color, type, true, null, isMandatory);
    }

    public static TransactionCategory CreateSystem(string name, string color, CategoryType type = CategoryType.Expense,
        bool isMandatory = false)
    {
        return new TransactionCategory(name, color, type, false, null, isMandatory);
    }

    public static TransactionCategory CreateUser(Guid userId, string name, string color,
        CategoryType type = CategoryType.Expense, bool isMandatory = false)
    {
        return new TransactionCategory(name, color, type, false, userId, isMandatory);
    }

    public void Update(string? name = null, string? color = null, bool? isMandatory = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(color);

        Name = name.Trim();
        Color = color.Trim();
        if (isMandatory.HasValue)
            IsMandatory = isMandatory.Value;
    }
}
