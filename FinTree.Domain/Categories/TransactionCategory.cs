using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Base;

namespace FinTree.Domain.Categories;

public sealed class TransactionCategory : Entity
{
    public Guid UserId { get; private set; }
    [MaxLength(50)] public string Name { get; private set; }
    [MaxLength(9)] public string Color { get; private set; }
    [MaxLength(40)] public string Icon { get; private set; }
    public CategoryType Type { get; private set; }
    public bool IsDefault { get; private set; }
    public bool IsMandatory { get; private set; }

    private TransactionCategory(Guid userId, string name, string color, string icon,
        CategoryType type = CategoryType.Expense, bool isDefault = false, bool isMandatory = false)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty, nameof(userId));
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(color);
        ArgumentException.ThrowIfNullOrWhiteSpace(icon);

        UserId = userId;
        Name = name.Trim();
        Color = color.Trim();
        Icon = icon.Trim();
        Type = type;
        IsDefault = isDefault;
        IsMandatory = isMandatory;
    }

    public static TransactionCategory CreateDefault(Guid userId, string name, string color, string icon = "pi-tag",
        CategoryType type = CategoryType.Expense, bool isMandatory = false)
    {
        return new TransactionCategory(userId, name, color, icon, type, true, isMandatory);
    }

    public static TransactionCategory CreateUser(Guid userId, string name, string color, string icon = "pi-tag",
        CategoryType type = CategoryType.Expense, bool isMandatory = false)
    {
        return new TransactionCategory(userId, name, color, icon, type, false, isMandatory);
    }

    public void Update(string? name = null, string? color = null, string? icon = null, bool? isMandatory = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(color);
        ArgumentException.ThrowIfNullOrWhiteSpace(icon);

        Name = name.Trim();
        Color = color.Trim();
        Icon = icon.Trim();
        if (isMandatory.HasValue)
            IsMandatory = isMandatory.Value;
    }
}
