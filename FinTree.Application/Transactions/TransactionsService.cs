using FinTree.Application.Exceptions;
using FinTree.Application.Transactions.Dto;
using FinTree.Application.Users;
using FinTree.Domain.Categories;
using FinTree.Domain.Transactions;
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

        Transaction newTransaction;
        switch (command.Type)
        {
            case CategoryType.Income:
                newTransaction = account.AddIncome(command.CategoryId, command.Amount, command.OccurredAt,
                    command.Description);
                break;
            case CategoryType.Expense:
                newTransaction = account.AddExpense(command.CategoryId, command.Amount, command.OccurredAt,
                    command.Description, command.IsMandatory);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(command.Type), "Неизвестный тип транзакции");
        }

        await context.SaveChangesAsync(ct);
        return newTransaction.Id;
    }

    public async Task<(List<TransactionDto> Items, int Total)> GetTransactionsAsync(Guid? accountId,
        TxFilter? filter, CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var q = context.ExpenseTransactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserId);

        if (accountId.HasValue)
            q = q.Where(t => t.AccountId == accountId);

        if (filter?.AccountId is { } acc)
            q = q.Where(t => t.AccountId == acc);

        if (filter?.From is { } from)
            q = q.Where(t => DateOnly.FromDateTime(t.OccurredAt) >= from);

        if (filter?.To is { } to)
            q = q.Where(t => DateOnly.FromDateTime(t.OccurredAt) <= to);

        if (!string.IsNullOrWhiteSpace(filter?.Search))
        {
            q = q.Where(t => t.Description != null &&
                             EF.Functions.Like(t.Description, $"%{filter.Search}%"));
        }

        var total = await q.CountAsync(ct);

        var items = await q.OrderByDescending(t => t.OccurredAt)
            .Select(t =>
                new TransactionDto(t.Id, t.AccountId, t.Money.Amount, t.CategoryId, t.Description, t.OccurredAt, t.IsMandatory))
            .ToListAsync(ct);

        return (items, total);
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
        var transaction = await context.ExpenseTransactions
            .Include(t => t.Account)
            .FirstOrDefaultAsync(t => t.Id == command.Id, ct) ??
                          throw new NotFoundException("Транзакция не найдена", command.Id);

        // Verify the transaction belongs to the current user
        if (transaction.Account.UserId != currentUser.Id)
            throw new InvalidOperationException("Доступ запрещен");

        // Get the new account to determine currency
        var newAccount = await context.Accounts.FirstOrDefaultAsync(a => a.Id == command.AccountId, ct) ??
                         throw new InvalidOperationException("Счет не найден");

        // Verify the new account also belongs to the current user
        if (newAccount.UserId != currentUser.Id)
            throw new InvalidOperationException("Доступ запрещен");

        var money = new Money(newAccount.CurrencyCode, command.Amount);
        transaction.UpdateExpense(command.AccountId, command.CategoryId, money, command.OccurredAt,
            command.Description, command.IsMandatory);

        await context.SaveChangesAsync(ct);
    }
}