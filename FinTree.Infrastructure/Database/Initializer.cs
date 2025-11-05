using FinTree.Domain.Accounts;
using FinTree.Domain.Categories;
using FinTree.Domain.Identity;
using FinTree.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Infrastructure.Database;

public static class Initializer
{
    public static async Task SeedTransactionCategories(AppDbContext context)
    {
        if (await context.TransactionCategories.AnyAsync())
            return;

        var categories = new[]
        {
            TransactionCategory.CreateDefault("Без категории", "#000000"),
            TransactionCategory.CreateSystem("Продукты", "#8fce00"),
            TransactionCategory.CreateSystem("Кафе и рестораны", "#c90076"),
            TransactionCategory.CreateSystem("Здоровье", "#cc0000"),
            TransactionCategory.CreateSystem("Транспорт", "#0078d7"),
            TransactionCategory.CreateSystem("Жильё и коммуналка", "#8e7cc3"),
            TransactionCategory.CreateSystem("Развлечения", "#ff9900"),
            TransactionCategory.CreateSystem("Покупки и одежда", "#b45f06"),
            TransactionCategory.CreateSystem("Подписки и сервисы", "#674ea7"),
            TransactionCategory.CreateSystem("Образование", "#3d85c6"),
            TransactionCategory.CreateSystem("Путешествия", "#45818e"),
            TransactionCategory.CreateSystem("Животные", "#a61c00"),
            TransactionCategory.CreateSystem("Подарки", "#e69138"),
            TransactionCategory.CreateSystem("Семья и дети", "#6aa84f"),
            TransactionCategory.CreateSystem("Красота и уход", "#a64d79"),
            TransactionCategory.CreateSystem("Налоги и сборы", "#351c75"),
            TransactionCategory.CreateSystem("Благотворительность", "#741b47"),
            TransactionCategory.CreateSystem("Работа и бизнес", "#134f5c"),
            
            TransactionCategory.CreateSystem("Зарплата", "#6aa84f", CategoryType.Income),
            TransactionCategory.CreateSystem("Фриланс", "#3d85c6", CategoryType.Income),
            TransactionCategory.CreateSystem("Подарки", "#e69138", CategoryType.Income),
            TransactionCategory.CreateSystem("Инвестиции", "#134f5c", CategoryType.Income),
            TransactionCategory.CreateSystem("Продажа вещей", "#b45f06", CategoryType.Income),
            TransactionCategory.CreateSystem("Кэшбэк и бонусы", "#ff9900", CategoryType.Income),
            TransactionCategory.CreateSystem("Бизнес", "#351c75", CategoryType.Income),
            TransactionCategory.CreateSystem("Пособия и выплаты", "#c90076", CategoryType.Income),
        };

        await context.TransactionCategories.AddRangeAsync(categories);
        await context.SaveChangesAsync();
    }


    public static async Task SeedTestUser(AppDbContext context)
    {
        if (await context.Users.AnyAsync())
            return;

        const string rubCode = "RUB";
        var user = new User("Тестовый пользователь", "test@example.com", rubCode);
        user.AddAccount(rubCode, AccountType.Bank, "Дебетовая карта");
        user.AddAccount(rubCode, AccountType.Cash, "Наличка");
        user.LinkTelegramAccount("gewoih");

        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();
    }
}