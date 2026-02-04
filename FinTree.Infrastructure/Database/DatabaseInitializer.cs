using FinTree.Domain.Accounts;
using FinTree.Domain.Categories;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Infrastructure.Database;

public sealed class DatabaseInitializer(AppDbContext context)
{
    public async Task SeedTransactionCategories()
    {
        if (await context.TransactionCategories.AnyAsync())
            return;

        var categories = new[]
        {
            TransactionCategory.CreateDefault("Без категории", "#9e9e9e"),

            TransactionCategory.CreateSystem("Продукты", "#4caf50", "pi-shopping-cart", isMandatory: true),
            TransactionCategory.CreateSystem("Кафе", "#ff7043", "pi-coffee"),
            TransactionCategory.CreateSystem("Здоровье", "#e53935", "pi-heart", isMandatory: true),
            TransactionCategory.CreateSystem("Транспорт", "#1e88e5", "pi-car", isMandatory: true),
            TransactionCategory.CreateSystem("Дом", "#8d6e63", "pi-home", isMandatory: true),
            TransactionCategory.CreateSystem("Развлечения", "#fb8c00", "pi-star"),
            TransactionCategory.CreateSystem("Подписки", "#7e57c2", "pi-refresh"),
            TransactionCategory.CreateSystem("Образование", "#3949ab", "pi-book"),
            TransactionCategory.CreateSystem("Путешествия", "#00897b", "pi-globe"),
            TransactionCategory.CreateSystem("Подарки", "#fbc02d", "pi-gift"),
            TransactionCategory.CreateSystem("Платежи", "#546e7a", "pi-credit-card", isMandatory: true),
            TransactionCategory.CreateSystem("Одежда", "#6d4c41", "pi-shopping-bag"),
            TransactionCategory.CreateSystem("Хобби", "#ffb74d", "pi-palette"),

            TransactionCategory.CreateSystem("Зарплата", "#2e7d32", "pi-briefcase", CategoryType.Income),
            TransactionCategory.CreateSystem("Фриланс", "#1565c0", "pi-desktop", CategoryType.Income),
            TransactionCategory.CreateSystem("Подарки", "#f9a825", "pi-gift", CategoryType.Income),
            TransactionCategory.CreateSystem("Инвестиции", "#00695c", "pi-chart-line", CategoryType.Income),
            TransactionCategory.CreateSystem("Кэшбэк", "#ffb300", "pi-percentage", CategoryType.Income),
            TransactionCategory.CreateSystem("Бизнес", "#4527a0", "pi-building", CategoryType.Income),
        };

        await context.TransactionCategories.AddRangeAsync(categories);
        await context.SaveChangesAsync();
    }
}
