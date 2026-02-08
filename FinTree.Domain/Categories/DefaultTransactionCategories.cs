namespace FinTree.Domain.Categories;

public readonly record struct TransactionCategoryTemplate(
    string Name,
    string Color,
    string Icon,
    CategoryType Type,
    bool IsDefault,
    bool IsMandatory);

public static class DefaultTransactionCategories
{
    public static IReadOnlyList<TransactionCategoryTemplate> All { get; } =
    [
        new TransactionCategoryTemplate("Без категории", "#9e9e9e", "pi-tag", CategoryType.Expense, true, false),

        new TransactionCategoryTemplate("Продукты", "#4caf50", "pi-shopping-cart", CategoryType.Expense, false, true),
        new TransactionCategoryTemplate("Кафе", "#ff7043", "pi-coffee", CategoryType.Expense, false, false),
        new TransactionCategoryTemplate("Здоровье", "#e53935", "pi-heart", CategoryType.Expense, false, true),
        new TransactionCategoryTemplate("Транспорт", "#1e88e5", "pi-car", CategoryType.Expense, false, true),
        new TransactionCategoryTemplate("Дом", "#8d6e63", "pi-home", CategoryType.Expense, false, true),
        new TransactionCategoryTemplate("Развлечения", "#fb8c00", "pi-star", CategoryType.Expense, false, false),
        new TransactionCategoryTemplate("Подписки", "#7e57c2", "pi-refresh", CategoryType.Expense, false, false),
        new TransactionCategoryTemplate("Образование", "#3949ab", "pi-book", CategoryType.Expense, false, false),
        new TransactionCategoryTemplate("Путешествия", "#00897b", "pi-globe", CategoryType.Expense, false, false),
        new TransactionCategoryTemplate("Подарки", "#fbc02d", "pi-gift", CategoryType.Expense, false, false),
        new TransactionCategoryTemplate("Платежи", "#546e7a", "pi-credit-card", CategoryType.Expense, false, true),
        new TransactionCategoryTemplate("Одежда", "#6d4c41", "pi-shopping-bag", CategoryType.Expense, false, false),
        new TransactionCategoryTemplate("Хобби", "#ffb74d", "pi-palette", CategoryType.Expense, false, false),

        new TransactionCategoryTemplate("Зарплата", "#2e7d32", "pi-briefcase", CategoryType.Income, false, false),
        new TransactionCategoryTemplate("Фриланс", "#1565c0", "pi-desktop", CategoryType.Income, false, false),
        new TransactionCategoryTemplate("Подарки", "#f9a825", "pi-gift", CategoryType.Income, false, false),
        new TransactionCategoryTemplate("Инвестиции", "#00695c", "pi-chart-line", CategoryType.Income, false, false),
        new TransactionCategoryTemplate("Кэшбэк", "#ffb300", "pi-percentage", CategoryType.Income, false, false),
        new TransactionCategoryTemplate("Бизнес", "#4527a0", "pi-building", CategoryType.Income, false, false),
    ];
}
