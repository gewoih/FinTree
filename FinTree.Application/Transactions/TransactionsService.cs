using FinTree.Application.Exceptions;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions.Dto;
using FinTree.Application.Users;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

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

    public async Task<(byte[] Content, string FileName)> ExportAsync(CancellationToken ct)
    {
        var currentUserId = currentUser.Id;

        var accounts = await context.Accounts.AsNoTracking()
            .Where(a => a.UserId == currentUserId)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.CurrencyCode
            })
            .OrderBy(a => a.Name)
            .ToListAsync(ct);

        if (accounts.Count == 0)
        {
            const string emptyContent = "Транзакции отсутствуют.";
            var emptyFileName = $"transactions_{DateTime.UtcNow:yyyy-MM-dd}.txt";
            return (Encoding.UTF8.GetBytes(emptyContent), emptyFileName);
        }

        var accountIds = accounts.Select(a => a.Id).ToArray();

        var categories = await context.TransactionCategories.AsNoTracking()
            .Where(c => c.UserId == currentUserId || c.UserId == null)
            .Select(c => new { c.Id, c.Name })
            .ToListAsync(ct);

        var categoryLookup = categories.ToDictionary(c => c.Id, c => c.Name);

        var transactions = await context.Transactions.AsNoTracking()
            .Where(t => accountIds.Contains(t.AccountId))
            .Select(t => new
            {
                t.AccountId,
                t.Money,
                t.Type,
                t.OccurredAt,
                t.Description,
                t.CategoryId
            })
            .OrderBy(t => t.OccurredAt)
            .ToListAsync(ct);

        if (transactions.Count == 0)
        {
            var emptyContent = "Транзакции отсутствуют.";
            var emptyFileName = $"transactions_{DateTime.UtcNow:yyyy-MM-dd}.txt";
            return (Encoding.UTF8.GetBytes(emptyContent), emptyFileName);
        }

        var transactionsByAccount = transactions
            .GroupBy(t => t.AccountId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var culture = CultureInfo.GetCultureInfo("ru-RU");
        var content = new StringBuilder();

        foreach (var account in accounts)
        {
            if (!transactionsByAccount.TryGetValue(account.Id, out var accountTransactions) ||
                accountTransactions.Count == 0)
            {
                continue;
            }

            content.Append("Счет: ")
                .Append(account.Name)
                .Append(" (")
                .Append(account.CurrencyCode.ToUpperInvariant())
                .AppendLine(")");

            foreach (var transaction in accountTransactions)
            {
                ct.ThrowIfCancellationRequested();

                var note = transaction.Description?.Trim().Replace("\t", " ").Replace("\r", " ").Replace("\n", " ");
                var dateLabel = transaction.OccurredAt.ToString("dd.MM.yyyy", culture);
                var categoryLabel = categoryLookup[transaction.CategoryId];

                content.Append(transaction.Money.Amount)
                    .Append(' ')
                    .Append(categoryLabel)
                    .Append(' ');
                    
                if (!string.IsNullOrWhiteSpace(note))
                    content.Append(note).Append(' ');
                
                content.Append(dateLabel).AppendLine();
            }

            content.AppendLine();
        }

        var fileName = $"transactions_{DateTime.UtcNow:yyyy-MM-dd}.txt";
        return (Encoding.UTF8.GetBytes(content.ToString()), fileName);
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
