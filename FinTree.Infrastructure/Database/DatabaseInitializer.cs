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
            TransactionCategory.CreateDefault("-", "#000000"),
            TransactionCategory.CreateSystem("Продукты", "#8fce00"),
            TransactionCategory.CreateSystem("Кафе", "#c90076"),
            TransactionCategory.CreateSystem("Здоровье", "#cc0000"),
            TransactionCategory.CreateSystem("Транспорт", "#0078d7"),
            TransactionCategory.CreateSystem("Дом", "#8e7cc3"),
            TransactionCategory.CreateSystem("Развлечения", "#ff9900"),
            TransactionCategory.CreateSystem("Покупки", "#b45f06"),
            TransactionCategory.CreateSystem("Подписки", "#674ea7"),
            TransactionCategory.CreateSystem("Образование", "#3d85c6"),
            TransactionCategory.CreateSystem("Путешествия", "#45818e"),
            TransactionCategory.CreateSystem("Подарки", "#e69138"),
            TransactionCategory.CreateSystem("Налоги", "#351c75"),
            
            TransactionCategory.CreateSystem("Зарплата", "#6aa84f", CategoryType.Income),
            TransactionCategory.CreateSystem("Фриланс", "#3d85c6", CategoryType.Income),
            TransactionCategory.CreateSystem("Подарки", "#e69138", CategoryType.Income),
            TransactionCategory.CreateSystem("Инвестиции", "#134f5c", CategoryType.Income),
            TransactionCategory.CreateSystem("Кэшбэк", "#ff9900", CategoryType.Income),
            TransactionCategory.CreateSystem("Бизнес", "#351c75", CategoryType.Income),
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