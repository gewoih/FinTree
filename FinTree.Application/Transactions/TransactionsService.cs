using FinTree.Application.Exceptions;
using FinTree.Application.Transactions.Dto;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Transactions;

public sealed class TransactionsService(AppDbContext context)
{
    public async Task<Guid> CreateAsync(CreateTransaction command, CancellationToken ct)
    {
        var account = await context.Accounts.FirstOrDefaultAsync(a => a.Id == command.AccountId, ct) ??
                      throw new InvalidOperationException("Счет не найден.");

        var newTransaction = account.AddExpense(command.CategoryId, command.Amount, command.OccurredAt,
            command.Description, command.IsMandatory);

        await context.SaveChangesAsync(ct);

        return newTransaction.Id;
    }

    public async Task<(List<TransactionDto> Items, int Total)> GetTransactionsAsync(Guid? accountId,
        TxFilter? filter, CancellationToken ct = default)
    {
        var q = context.Transactions.AsNoTracking();

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
                new TransactionDto(t.Id, t.AccountId, t.Money.Amount, t.CategoryId, t.Description, t.OccurredAt))
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
}