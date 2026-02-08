using FinTree.Application.Exceptions;
using FinTree.Application.Transactions.Dto;
using FinTree.Application.Users;
using FinTree.Domain.Categories;
using FinTree.Domain.Identity;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Transactions;

public sealed class TransactionCategoryService(AppDbContext context, ICurrentUser currentUser)
{
    public async Task<Guid> CreateCategoryAsync(CreateTransactionCategory command, CancellationToken ct)
    {
        var userId = currentUser.Id;
        var user = await context.Users
                       .Include(u => u.TransactionCategories)
                       .SingleOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundException(nameof(User), userId);

        var icon = string.IsNullOrWhiteSpace(command.Icon) ? "pi-tag" : command.Icon;
        var transactionCategory = user.AddTransactionCategory(command.CategoryType, command.Name, command.Color,
            icon, command.IsMandatory);
        await context.SaveChangesAsync(ct);

        return transactionCategory.Id;
    }

    public async Task UpdateTransactionCategoryAsync(UpdateTransactionCategory command, CancellationToken ct)
    {
        var transactionCategory =
            await context.TransactionCategories
                .Where(tc => tc.UserId == currentUser.Id)
                .FirstOrDefaultAsync(tc => tc.Id == command.Id, cancellationToken: ct) ??
            throw new NotFoundException("Категория не найдена", command.Id);

        var icon = string.IsNullOrWhiteSpace(command.Icon) ? transactionCategory.Icon : command.Icon;
        transactionCategory.Update(command.Name, command.Color, icon, command.IsMandatory);
        await context.SaveChangesAsync(ct);
    }

    public async Task DeleteCategoryAsync(Guid id, CancellationToken ct)
    {
        var transactionCategory =
            await context.TransactionCategories
                .Where(tc => tc.UserId == currentUser.Id)
                .FirstOrDefaultAsync(tc => tc.Id == id, cancellationToken: ct) ??
            throw new NotFoundException("Категория не найдена", id);

        if (transactionCategory.IsDefault ||
            string.Equals(transactionCategory.Name, "Без категории", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Категорию \"Без категории\" нельзя удалить.");

        await using var transaction = await context.Database.BeginTransactionAsync(ct);

        var fallbackCategory = await context.TransactionCategories
            .Where(tc => tc.UserId == currentUser.Id && tc.Name == "Без категории")
            .FirstOrDefaultAsync(ct);

        if (fallbackCategory is null)
        {
            fallbackCategory = TransactionCategory.CreateDefault(currentUser.Id, "Без категории", "#9e9e9e");
            await context.TransactionCategories.AddAsync(fallbackCategory, ct);
            await context.SaveChangesAsync(ct);
        }

        await context.Transactions
            .Where(t => t.CategoryId == transactionCategory.Id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.CategoryId, fallbackCategory.Id), ct);

        transactionCategory.Delete();
        await context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
