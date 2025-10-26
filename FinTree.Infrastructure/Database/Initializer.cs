using FinTree.Domain.Accounts;
using FinTree.Domain.Currencies;
using FinTree.Domain.Identity;
using FinTree.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Infrastructure.Database;

public static class Initializer
{
    public static async Task SeedCurrencies(AppDbContext context)
    {
        if (await context.Currencies.AnyAsync())
            return;

        var usd = new Currency("USD", "Доллар США", "$", CurrencyType.Fiat);
        var eur = new Currency("EUR", "Евро", "€", CurrencyType.Fiat);
        var rub = new Currency("RUB", "Российский рубль", "₽", CurrencyType.Fiat);
        var kzt = new Currency("KZT", "Тенге", "₸", CurrencyType.Fiat);

        await context.Currencies.AddRangeAsync(usd, eur, rub, kzt);
        await context.SaveChangesAsync();
    }

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

        var rubId = await context.Currencies
            .Where(c => c.Code == "RUB")
            .Select(c => c.Id)
            .SingleAsync();

        var user = new User("Тестовый пользователь", rubId);
        user.AddAccount(rubId, AccountType.Bank, "Дебетовая карта");
        user.AddAccount(rubId, AccountType.Cash, "Наличка");
        user.LinkTelegramAccount("gewoih");
        
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();
    }
}