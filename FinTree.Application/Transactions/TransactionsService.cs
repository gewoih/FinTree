using FinTree.Application.Dto;
using FinTree.Domain;
using FinTree.Domain.Transactions;
using FinTree.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Transactions;

public sealed class TransactionsService(AppDbContext context)
{
    public async Task<Guid> CreateAsync(CreateTransaction command, CancellationToken ct = default)
    {
        var account = await context.Accounts.FirstOrDefaultAsync(a => a.Id == command.AccountId, ct) ??
                      throw new InvalidOperationException("Счет не найден.");

        var newTransaction = account.AddExpense(command.CategoryId, command.Amount, command.OccurredAt,
            command.Description, command.IsMandatory);

        await context.SaveChangesAsync(ct);

        return newTransaction.Id;
    }

    public async Task<(IReadOnlyList<Transaction> Items, int Total)> GetTransactionsAsync(Guid accountId,
        TxFilter filter, CancellationToken ct = default)
    {
        var q = context.Transactions
            .AsNoTracking()
            .Where(t => t.AccountId == accountId);

        if (filter.AccountId is { } acc)
            q = q.Where(t => t.AccountId == acc);

        if (filter.From is { } from)
            q = q.Where(t => DateOnly.FromDateTime(t.OccurredAt) >= from);

        if (filter.To is { } to)
            q = q.Where(t => DateOnly.FromDateTime(t.OccurredAt) <= to);

        if (!string.IsNullOrWhiteSpace(filter.Search))
            q = q.Where(t => t.Description != null &&
                             EF.Functions.Like(t.Description, $"%{filter.Search}%"));

        var total = await q.CountAsync(ct);

        var items = await q.OrderByDescending(t => t.OccurredAt)
            .ThenByDescending(t => t.Id)
            .Skip((filter.Page - 1) * filter.Size)
            .Take(filter.Size)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task AssignCategoryAsync(Guid txId, Guid categoryId, CancellationToken ct = default)
    {
        var tx = await context.Transactions.FirstOrDefaultAsync(t => t.Id == txId, ct) ??
                 throw new InvalidOperationException("Transaction not found");

        tx.AssignCategory(categoryId);
        await context.SaveChangesAsync(ct);
    }
}