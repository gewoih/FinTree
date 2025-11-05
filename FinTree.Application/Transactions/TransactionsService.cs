using FinTree.Application.Exceptions;
using FinTree.Application.Transactions.Dto;
using FinTree.Application.Users;
using FinTree.Domain.ValueObjects;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Transactions;

public sealed class TransactionsService(AppDbContext context, ICurrentUser currentUser)
{
    public async Task<Guid> CreateAsync(CreateTransaction command, CancellationToken ct)
    {
        var account = await context.Accounts.FirstOrDefaultAsync(a => a.Id == command.AccountId, ct) ??
                      throw new InvalidOperationException("Счет не найден.");

        var newTransaction = account.AddTransaction(command.Type, command.CategoryId, command.Amount,
            command.OccurredAt, command.Description, command.IsMandatory);

        await context.SaveChangesAsync(ct);
        return newTransaction.Id;
    }

    public async Task<List<TransactionDto>> GetTransactionsAsync(Guid? accountId, CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var userTransactionsQuery = context.Transactions
            .AsNoTracking()
            .Include(t => t.Account)
            .Where(t => t.Account.UserId == currentUserId);

        if (accountId.HasValue)
            userTransactionsQuery = userTransactionsQuery.Where(t => t.AccountId == accountId);

        var userTransactions = await userTransactionsQuery
            .Select(t =>
                new TransactionDto(
                    t.Id,
                    t.AccountId,
                    t.Money.Amount,
                    t.CategoryId,
                    t.Description,
                    t.OccurredAt,
                    t.IsMandatory))
            .ToListAsync(ct);

        return userTransactions;
    }

    public async Task AssignCategoryAsync(AssignCategory command, CancellationToken ct)
    {
        var transaction = await context.Transactions.FirstOrDefaultAsync(t => t.Id == command.TransactionId, ct) ??
                          throw new NotFoundException("Transaction not found", command.TransactionId);

        transaction.AssignCategory(command.CategoryId);
        await context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(UpdateTransaction command, CancellationToken ct)
    {
        var transaction = await context.Transactions
                              .Include(t => t.Account)
                              .FirstOrDefaultAsync(t => t.Id == command.Id, ct) ??
                          throw new NotFoundException("Транзакция не найдена", command.Id);

        if (transaction.Account.UserId != currentUser.Id)
            throw new InvalidOperationException("Доступ запрещен");

        var newAccount = await context.Accounts.FirstOrDefaultAsync(a => a.Id == command.AccountId, ct) ??
                         throw new InvalidOperationException("Счет не найден");

        if (newAccount.UserId != currentUser.Id)
            throw new InvalidOperationException("Доступ запрещен");

        var money = new Money(newAccount.CurrencyCode, command.Amount);
        transaction.Update(command.AccountId, command.CategoryId, money, command.OccurredAt,
            command.Description, command.IsMandatory);

        await context.SaveChangesAsync(ct);
    }
}