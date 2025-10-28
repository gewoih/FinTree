using FinTree.Domain.Accounts;
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

        var unknownCategory = TransactionCategory.CreateDefault("Без категории", "#000000");
        var groceries = TransactionCategory.CreateSystem("Продукты", "#8fce00");
        var restaurants = TransactionCategory.CreateSystem("Кафе/Рестораны", "#c90076");
        var health = TransactionCategory.CreateSystem("Здоровье", "#cc0000");

        await context.TransactionCategories.AddRangeAsync(unknownCategory, groceries, restaurants, health);
        await context.SaveChangesAsync();
    }

    public static async Task SeedTestUser(AppDbContext context)
    {
        if (await context.Users.AnyAsync())
            return;

        const string rubCode = "RUB";
        var user = new User("Тестовый пользователь", rubCode);
        user.AddAccount(rubCode, AccountType.Bank, "Дебетовая карта");
        user.AddAccount(rubCode, AccountType.Cash, "Наличка");
        user.LinkTelegramAccount("gewoih");
        
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();
    }
}