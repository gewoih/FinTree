using FinTree.Application.Exceptions;
using FinTree.Application.Transactions.Dto;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Transactions;

public sealed class TransactionCategoryService(AppDbContext context)
{
    public async Task<Guid> CreateCategoryAsync(CreateTransactionCategory command, CancellationToken ct)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == command.UserId, ct);
        if (user is null)
            throw new AccessViolationException("Пользователь не найден");

        var transactionCategory = user.AddTransactionCategory(command.Name, command.Color);
        await context.SaveChangesAsync(ct);

        return transactionCategory.Id;
    }
    
    public async Task UpdateTransactionCategoryAsync(UpdateTransactionCategory command, CancellationToken ct)
    {
        var transactionCategory =
            await context.TransactionCategories.FirstOrDefaultAsync(tc => tc.Id == command.Id, cancellationToken: ct) ??
            throw new NotFoundException("Категория не найдена", command.Id);
        
        transactionCategory.Update(command.Name, command.Color);
        await context.SaveChangesAsync(ct);
    }

    public async Task DeleteCategoryAsync(Guid id, CancellationToken ct)
    {
        var transactionCategory =
            await context.TransactionCategories.FirstOrDefaultAsync(tc => tc.Id == id, cancellationToken: ct) ??
            throw new NotFoundException("Категория не найдена", id);
        
        transactionCategory.Delete();
        await context.SaveChangesAsync(ct);
    }
}