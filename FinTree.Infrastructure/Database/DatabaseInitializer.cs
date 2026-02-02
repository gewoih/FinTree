using FinTree.Domain.Accounts;
using FinTree.Domain.Categories;
using FinTree.Domain.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Infrastructure.Database;

public sealed class DatabaseInitializer(AppDbContext context, UserManager<User> userManager)
{
    public async Task SeedTransactionCategories()
    {
        if (await context.TransactionCategories.AnyAsync())
            return;

        var categories = new[]
        {
            TransactionCategory.CreateDefault("Без категории", "#9e9e9e"),

            TransactionCategory.CreateSystem("Продукты", "#4caf50", isMandatory: true),
            TransactionCategory.CreateSystem("Кафе", "#ff7043"),
            TransactionCategory.CreateSystem("Здоровье", "#e53935", isMandatory: true),
            TransactionCategory.CreateSystem("Транспорт", "#1e88e5", isMandatory: true),
            TransactionCategory.CreateSystem("Дом", "#8d6e63", isMandatory: true),
            TransactionCategory.CreateSystem("Развлечения", "#fb8c00"),
            TransactionCategory.CreateSystem("Подписки", "#7e57c2"),
            TransactionCategory.CreateSystem("Образование", "#3949ab"),
            TransactionCategory.CreateSystem("Путешествия", "#00897b"),
            TransactionCategory.CreateSystem("Подарки", "#fbc02d"),
            TransactionCategory.CreateSystem("Платежи", "#546e7a", isMandatory: true),
            TransactionCategory.CreateSystem("Одежда", "#6d4c41"),
            TransactionCategory.CreateSystem("Хобби", "#ffb74d"),

            TransactionCategory.CreateSystem("Зарплата", "#2e7d32", CategoryType.Income),
            TransactionCategory.CreateSystem("Фриланс", "#1565c0", CategoryType.Income),
            TransactionCategory.CreateSystem("Подарки", "#f9a825", CategoryType.Income),
            TransactionCategory.CreateSystem("Инвестиции", "#00695c", CategoryType.Income),
            TransactionCategory.CreateSystem("Кэшбэк", "#ffb300", CategoryType.Income),
            TransactionCategory.CreateSystem("Бизнес", "#4527a0", CategoryType.Income),
        };

        await context.TransactionCategories.AddRangeAsync(categories);
        await context.SaveChangesAsync();
    }


    public async Task SeedTestUser()
    {
        if (await userManager.Users.AnyAsync())
            return;

        const string rubCode = "RUB";
        var user = new User("nranenko@bk.ru", "nranenko@bk.ru", rubCode);
        await userManager.CreateAsync(user, "24042001Nr.");
        
        user.AddAccount(rubCode, AccountType.Bank, "Дебетовая карта");
        user.AddAccount(rubCode, AccountType.Cash, "Наличные");
        user.LinkTelegramAccount("gewoih");

        await context.SaveChangesAsync();
    }
}