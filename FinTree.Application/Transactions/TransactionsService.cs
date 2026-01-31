using FinTree.Application.Exceptions;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions.Dto;
using FinTree.Application.Users;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Transactions;

public sealed class TransactionsService(AppDbContext context, ICurrentUser currentUser, CurrencyConverter currencyConverter)
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
        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var userTransactionsQuery = context.Transactions
            .AsNoTracking()
            .Include(t => t.Account)
            .Where(t => t.Account.UserId == currentUserId);

        if (accountId.HasValue)
            userTransactionsQuery = userTransactionsQuery.Where(t => t.AccountId == accountId);

        var rawTransactions = await userTransactionsQuery
            .Select(t => new
            {
                t.Id,
                t.AccountId,
                t.Money,
                t.CategoryId,
                t.Description,
                t.OccurredAt,
                t.IsMandatory,
                t.Type
            })
            .ToListAsync(ct);

        var userTransactions = new List<TransactionDto>(rawTransactions.Count);

        foreach (var transaction in rawTransactions)
        {
            ct.ThrowIfCancellationRequested();

            var occurredAt = transaction.OccurredAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(transaction.OccurredAt, DateTimeKind.Utc)
                : transaction.OccurredAt.ToUniversalTime();

            var baseMoney = await currencyConverter.ConvertAsync(
                transaction.Money,
                baseCurrencyCode,
                occurredAt,
                ct);

            userTransactions.Add(new TransactionDto(
                transaction.Id,
                transaction.AccountId,
                transaction.Money.Amount,
                transaction.CategoryId,
                transaction.Description,
                transaction.OccurredAt,
                transaction.IsMandatory,
                transaction.Type,
                baseMoney.Amount,
                transaction.Money.Amount,
                transaction.Money.CurrencyCode));
        }

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

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var transaction = await context.Transactions
            .Include(t => t.Account)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (transaction == null)
            throw new NotFoundException(nameof(Transaction), id);

        if (transaction.Account.UserId != currentUser.Id)
            throw new InvalidOperationException("Доступ запрещен");
        
        transaction.Delete();
        await context.SaveChangesAsync(ct);
    }
}
