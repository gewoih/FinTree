using FinTree.Application.Exceptions;
using FinTree.Application.Transactions.Dto;
using FinTree.Application.Users;
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

        var transactionCategory = user.AddTransactionCategory(command.CategoryType, command.Name, command.Color);
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

        transactionCategory.Update(command.Name, command.Color);
        await context.SaveChangesAsync(ct);
    }

    public async Task DeleteCategoryAsync(Guid id, CancellationToken ct)
    {
        var transactionCategory =
            await context.TransactionCategories
                .Where(tc => tc.UserId == currentUser.Id)
                .FirstOrDefaultAsync(tc => tc.Id == id, cancellationToken: ct) ??
            throw new NotFoundException("Категория не найдена", id);

        transactionCategory.Delete();
        await context.SaveChangesAsync(ct);
    }
}