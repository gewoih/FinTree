using FinTree.Domain.Categories;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Infrastructure.Database;

public sealed class DatabaseInitializer(AppDbContext context)
{
    public async Task SeedTransactionCategories()
    {
        var usersWithoutCategories = await context.Users
            .Where(u => !context.TransactionCategories.Any(c => c.UserId == u.Id))
            .Select(u => u.Id)
            .ToListAsync();

        if (usersWithoutCategories.Count == 0)
            return;

        var templates = DefaultTransactionCategories.All;
        var categories = new List<TransactionCategory>();

        foreach (var userId in usersWithoutCategories)
        {
            foreach (var template in templates)
            {
                var category = template.IsDefault
                    ? TransactionCategory.CreateDefault(userId, template.Name, template.Color, template.Icon,
                        template.Type, template.IsMandatory)
                    : TransactionCategory.CreateUser(userId, template.Name, template.Color, template.Icon,
                        template.Type, template.IsMandatory);

                categories.Add(category);
            }
        }

        await context.TransactionCategories.AddRangeAsync(categories);
        await context.SaveChangesAsync();
    }
}
