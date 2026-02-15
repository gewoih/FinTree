using FinTree.Application.Abstractions;
using FinTree.Application.Common;
using FinTree.Application.Exceptions;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions.Dto;
using FinTree.Application.Users;
using FinTree.Domain.Accounts;
using FinTree.Domain.Categories;
using FinTree.Domain.Transactions;
using FinTree.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace FinTree.Application.Transactions;

public sealed class TransactionsService(IAppDbContext context, ICurrentUser currentUser, CurrencyConverter currencyConverter)
{
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;
    private readonly record struct CategoryAccessMeta(bool IsMandatory, CategoryType Type);

    public async Task<Guid> CreateAsync(CreateTransaction command, CancellationToken ct)
    {
        var account = await context.Accounts.FirstOrDefaultAsync(a => a.Id == command.AccountId, ct) ??
                      throw new NotFoundException(nameof(Account), command.AccountId);
        
        if (account.UserId != currentUser.Id)
            throw new ForbiddenException("Доступ запрещен");
        EnsureAccountIsActive(account);

        var categoryAccess = await EnsureCategoryAccessAsync(command.CategoryId, ct);
        EnsureCategoryTypeMatchesTransactionType(categoryAccess.Type, command.Type);

        var newTransaction = account.AddTransaction(command.Type, command.CategoryId, command.Amount,
            command.OccurredAt, command.Description, command.IsMandatory);

        await context.SaveChangesAsync(ct);
        return newTransaction.Id;
    }

    public async Task<PagedResult<TransactionDto>> GetTransactionsAsync(TxFilter filter, CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var page = filter.Page < 1 ? 1 : filter.Page;
        var size = filter.Size is < 1 or > MaxPageSize ? DefaultPageSize : filter.Size;

        var baseCurrencyCode = await context.Users
            .Where(u => u.Id == currentUserId)
            .Select(u => u.BaseCurrencyCode)
            .SingleAsync(ct);

        var userTransactionsQuery = context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserId);

        if (filter.AccountId.HasValue)
            userTransactionsQuery = userTransactionsQuery.Where(t => t.AccountId == filter.AccountId.Value);

        if (filter.CategoryId.HasValue)
            userTransactionsQuery = userTransactionsQuery.Where(t => t.CategoryId == filter.CategoryId.Value);

        if (filter.From.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(filter.From.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            userTransactionsQuery = userTransactionsQuery.Where(t => t.OccurredAt >= fromUtc);
        }

        if (filter.To.HasValue)
        {
            var toExclusiveUtc = DateTime.SpecifyKind(filter.To.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc)
                .AddDays(1);
            userTransactionsQuery = userTransactionsQuery.Where(t => t.OccurredAt < toExclusiveUtc);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLowerInvariant();
            var likePattern = $"%{search}%";
            userTransactionsQuery = userTransactionsQuery.Where(t =>
                EF.Functions.Like((t.Description ?? string.Empty).ToLower(), likePattern) ||
                EF.Functions.Like(t.Account.Name.ToLower(), likePattern) ||
                context.TransactionCategories.Any(c =>
                    c.UserId == currentUserId &&
                    c.Id == t.CategoryId &&
                    EF.Functions.Like(c.Name.ToLower(), likePattern)));
        }

        var total = await userTransactionsQuery.CountAsync(ct);

        var rawTransactions = await userTransactionsQuery
            .OrderByDescending(t => t.OccurredAt)
            .ThenByDescending(t => t.Id)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(t => new
            {
                t.Id,
                t.AccountId,
                t.Money,
                t.CategoryId,
                t.Description,
                t.OccurredAt,
                t.IsMandatory,
                t.Type,
                t.IsTransfer,
                t.TransferId
            })
            .ToListAsync(ct);

        var normalizedTransactions = rawTransactions.Select(transaction =>
        {
            var occurredAtUtc = NormalizeUtc(transaction.OccurredAt);
            return new
            {
                transaction.Id,
                transaction.AccountId,
                transaction.Money,
                transaction.CategoryId,
                transaction.Description,
                transaction.OccurredAt,
                transaction.IsMandatory,
                transaction.Type,
                transaction.IsTransfer,
                transaction.TransferId,
                OccurredAtUtc = occurredAtUtc
            };
        }).ToList();

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesAsync(
            normalizedTransactions.Select(t => (t.Money.CurrencyCode, t.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var userTransactions = new List<TransactionDto>(normalizedTransactions.Count);

        foreach (var transaction in normalizedTransactions)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (NormalizeCurrencyCode(transaction.Money.CurrencyCode), transaction.OccurredAtUtc.Date);
            var rate = rateByCurrencyAndDay[rateKey];
            var amountInBaseCurrency = transaction.Money.Amount * rate;

            userTransactions.Add(new TransactionDto(
                transaction.Id,
                transaction.AccountId,
                transaction.Money.Amount,
                transaction.CategoryId,
                transaction.Description,
                transaction.OccurredAt,
                transaction.IsMandatory,
                transaction.Type,
                transaction.IsTransfer,
                transaction.TransferId,
                amountInBaseCurrency,
                transaction.Money.Amount,
                transaction.Money.CurrencyCode));
        }

        return new PagedResult<TransactionDto>(userTransactions, page, size, total);
    }

    public async Task<Guid> CreateTransferAsync(CreateTransfer command, CancellationToken ct)
    {
        if (command.FromAccountId == command.ToAccountId)
            throw new DomainValidationException("Счет списания и счет зачисления должны быть разными.");
        if (command.FromAmount <= 0)
            throw new DomainValidationException("Сумма списания должна быть больше нуля.");
        if (command.ToAmount <= 0)
            throw new DomainValidationException("Сумма зачисления должна быть больше нуля.");
        if (command.FeeAmount is < 0)
            throw new DomainValidationException("Комиссия не может быть отрицательной.");

        var currentUserId = currentUser.Id;
        var accounts = await context.Accounts
            .Where(a => a.UserId == currentUserId &&
                        (a.Id == command.FromAccountId || a.Id == command.ToAccountId))
            .ToListAsync(ct);

        var fromAccount = accounts.FirstOrDefault(a => a.Id == command.FromAccountId);
        if (fromAccount is null)
            throw new NotFoundException(nameof(Account), command.FromAccountId);
        EnsureAccountIsActive(fromAccount);

        var toAccount = accounts.FirstOrDefault(a => a.Id == command.ToAccountId);
        if (toAccount is null)
            throw new NotFoundException(nameof(Account), command.ToAccountId);
        EnsureAccountIsActive(toAccount);

        var categories = await context.TransactionCategories
            .AsNoTracking()
            .Where(c => c.UserId == currentUserId)
            .Select(c => new { c.Id, c.Name, c.IsDefault })
            .ToListAsync(ct);

        if (categories.Count == 0)
            throw new ConflictException("Не удалось подобрать категорию для перевода.");

        var transferCategoryId = categories
                                     .FirstOrDefault(c => c.Name == "Без категории")?.Id
                                 ?? categories.FirstOrDefault(c => c.IsDefault)?.Id
                                 ?? categories[0].Id;

        var feeCategoryId = categories
                                .FirstOrDefault(c => c.Name == "Платежи")?.Id
                            ?? transferCategoryId;

        var transferId = Guid.NewGuid();
        var description = string.IsNullOrWhiteSpace(command.Description) ? null : command.Description.Trim();

        fromAccount.AddTransaction(
            TransactionType.Expense,
            transferCategoryId,
            command.FromAmount,
            command.OccurredAt,
            description,
            isMandatory: false,
            isTransfer: true,
            transferId: transferId);

        toAccount.AddTransaction(
            TransactionType.Income,
            transferCategoryId,
            command.ToAmount,
            command.OccurredAt,
            description,
            isMandatory: false,
            isTransfer: true,
            transferId: transferId);

        if (command.FeeAmount is > 0)
        {
            fromAccount.AddTransaction(
                TransactionType.Expense,
                feeCategoryId,
                command.FeeAmount.Value,
                command.OccurredAt,
                description,
                isMandatory: false,
                isTransfer: false,
                transferId: transferId);
        }

        await context.SaveChangesAsync(ct);
        return transferId;
    }

    public async Task UpdateTransferAsync(UpdateTransfer command, CancellationToken ct)
    {
        if (command.TransferId == Guid.Empty)
            throw new DomainValidationException("Не указан перевод для обновления.");
        if (command.FromAccountId == command.ToAccountId)
            throw new DomainValidationException("Счет списания и счет зачисления должны быть разными.");
        if (command.FromAmount <= 0)
            throw new DomainValidationException("Сумма списания должна быть больше нуля.");
        if (command.ToAmount <= 0)
            throw new DomainValidationException("Сумма зачисления должна быть больше нуля.");
        if (command.FeeAmount is < 0)
            throw new DomainValidationException("Комиссия не может быть отрицательной.");

        var currentUserId = currentUser.Id;
        var accounts = await context.Accounts
            .Where(a => a.UserId == currentUserId &&
                        (a.Id == command.FromAccountId || a.Id == command.ToAccountId))
            .ToListAsync(ct);

        var fromAccount = accounts.FirstOrDefault(a => a.Id == command.FromAccountId);
        if (fromAccount is null)
            throw new NotFoundException(nameof(Account), command.FromAccountId);
        EnsureAccountIsActive(fromAccount);

        var toAccount = accounts.FirstOrDefault(a => a.Id == command.ToAccountId);
        if (toAccount is null)
            throw new NotFoundException(nameof(Account), command.ToAccountId);
        EnsureAccountIsActive(toAccount);

        var categories = await context.TransactionCategories
            .AsNoTracking()
            .Where(c => c.UserId == currentUserId)
            .Select(c => new { c.Id, c.Name, c.IsDefault })
            .ToListAsync(ct);

        if (categories.Count == 0)
            throw new ConflictException("Не удалось подобрать категорию для перевода.");

        var transferCategoryId = categories
                                     .FirstOrDefault(c => c.Name == "Без категории")?.Id
                                 ?? categories.FirstOrDefault(c => c.IsDefault)?.Id
                                 ?? categories[0].Id;

        var feeCategoryId = categories
                                .FirstOrDefault(c => c.Name == "Платежи")?.Id
                            ?? transferCategoryId;

        var transferTransactions = await context.Transactions
            .Include(t => t.Account)
            .Where(t => t.TransferId == command.TransferId)
            .ToListAsync(ct);

        if (transferTransactions.Count == 0)
            throw new NotFoundException("Перевод не найден", command.TransferId);

        if (transferTransactions.Any(t => t.Account.UserId != currentUserId))
            throw new ForbiddenException("Доступ запрещен");

        var expenseTransfer = transferTransactions.FirstOrDefault(t =>
            t.IsTransfer && t.Type == TransactionType.Expense);
        var incomeTransfer = transferTransactions.FirstOrDefault(t =>
            t.IsTransfer && t.Type == TransactionType.Income);

        if (expenseTransfer is null || incomeTransfer is null)
            throw new ConflictException("Перевод поврежден и не может быть обновлен.");

        var description = string.IsNullOrWhiteSpace(command.Description) ? null : command.Description.Trim();

        expenseTransfer.Update(
            fromAccount.Id,
            transferCategoryId,
            new Money(fromAccount.CurrencyCode, command.FromAmount),
            command.OccurredAt,
            description,
            false);

        incomeTransfer.Update(
            toAccount.Id,
            transferCategoryId,
            new Money(toAccount.CurrencyCode, command.ToAmount),
            command.OccurredAt,
            description,
            false);

        var feeTransactions = transferTransactions
            .Where(t => !t.IsTransfer)
            .ToList();

        if (command.FeeAmount is > 0)
        {
            var feeMoney = new Money(fromAccount.CurrencyCode, command.FeeAmount.Value);

            if (feeTransactions.Count > 0)
            {
                var feeTransaction = feeTransactions[0];
                feeTransaction.Update(
                    fromAccount.Id,
                    feeCategoryId,
                    feeMoney,
                    command.OccurredAt,
                    description,
                    false);

                foreach (var extra in feeTransactions.Skip(1))
                    extra.Delete();
            }
            else
            {
                fromAccount.AddTransaction(
                    TransactionType.Expense,
                    feeCategoryId,
                    command.FeeAmount.Value,
                    command.OccurredAt,
                    description,
                    isMandatory: false,
                    isTransfer: false,
                    transferId: command.TransferId);
            }
        }
        else
        {
            foreach (var fee in feeTransactions)
                fee.Delete();
        }

        await context.SaveChangesAsync(ct);
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
            .Where(c => c.UserId == currentUserId)
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
        var transaction = await context.Transactions
                              .Include(t => t.Account)
                              .FirstOrDefaultAsync(t => t.Id == command.TransactionId, ct) ??
                          throw new NotFoundException("Transaction not found", command.TransactionId);

        if (transaction.Account.UserId != currentUser.Id)
            throw new ForbiddenException("Доступ запрещен");

        if (transaction.TransferId is not null)
            throw new ConflictException("Переводы нельзя редактировать как обычные транзакции.");

        var categoryAccess = await EnsureCategoryAccessAsync(command.CategoryId, ct);
        EnsureCategoryTypeMatchesTransactionType(categoryAccess.Type, transaction.Type);

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
            throw new ForbiddenException("Доступ запрещен");
        if (transaction.TransferId is not null)
            throw new ConflictException("Переводы нельзя редактировать как обычные транзакции.");

        var newAccount = await context.Accounts.FirstOrDefaultAsync(a => a.Id == command.AccountId, ct) ??
                         throw new NotFoundException(nameof(Account), command.AccountId);

        if (newAccount.UserId != currentUser.Id)
            throw new ForbiddenException("Доступ запрещен");
        EnsureAccountIsActive(newAccount);

        var categoryAccess = await EnsureCategoryAccessAsync(command.CategoryId, ct);
        EnsureCategoryTypeMatchesTransactionType(categoryAccess.Type, transaction.Type);

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
            throw new ForbiddenException("Доступ запрещен");

        if (transaction.TransferId is not null)
        {
            var transferTransactions = await context.Transactions
                .Where(t => t.TransferId == transaction.TransferId)
                .ToListAsync(ct);

            foreach (var item in transferTransactions)
                item.Delete();

            await context.SaveChangesAsync(ct);
            return;
        }

        transaction.Delete();
        await context.SaveChangesAsync(ct);
    }

    public async Task DeleteTransferAsync(Guid transferId, CancellationToken ct)
    {
        if (transferId == Guid.Empty)
            throw new DomainValidationException("Перевод не найден.");

        var currentUserId = currentUser.Id;
        var transferTransactions = await context.Transactions
            .Include(t => t.Account)
            .Where(t => t.TransferId == transferId)
            .ToListAsync(ct);

        if (transferTransactions.Count == 0)
            throw new NotFoundException("Перевод не найден", transferId);

        if (transferTransactions.Any(t => t.Account.UserId != currentUserId))
            throw new ForbiddenException("Доступ запрещен");

        foreach (var item in transferTransactions)
            item.Delete();

        await context.SaveChangesAsync(ct);
    }

    private async Task<CategoryAccessMeta> EnsureCategoryAccessAsync(Guid categoryId, CancellationToken ct)
    {
        if (categoryId == Guid.Empty)
            throw new DomainValidationException("Категория не найдена");

        var categoryMeta = await context.TransactionCategories
            .AsNoTracking()
            .Where(c => c.Id == categoryId)
            .Select(c => new { c.Id, c.UserId, c.IsMandatory, c.Type })
            .SingleOrDefaultAsync(ct);

        if (categoryMeta is null)
            throw new NotFoundException("Категория", categoryId);

        if (categoryMeta.UserId != currentUser.Id)
            throw new ForbiddenException();

        return new CategoryAccessMeta(categoryMeta.IsMandatory, categoryMeta.Type);
    }

    private static void EnsureCategoryTypeMatchesTransactionType(CategoryType categoryType, TransactionType transactionType)
    {
        var expectedCategoryType = transactionType == TransactionType.Income ? CategoryType.Income : CategoryType.Expense;
        if (categoryType == expectedCategoryType)
            return;

        throw new DomainValidationException(
            "Категория не соответствует типу транзакции.",
            "category_type_mismatch",
            new { transactionType, categoryType });
    }

    private static DateTime NormalizeUtc(DateTime value)
    {
        return value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
            : value.ToUniversalTime();
    }

    private static string NormalizeCurrencyCode(string currencyCode)
    {
        return string.IsNullOrWhiteSpace(currencyCode) ? throw new DomainValidationException("Код валюты не задан.", "currency_code_missing") : currencyCode.Trim().ToUpperInvariant();
    }

    private static void EnsureAccountIsActive(Account account)
    {
        if (account.IsArchived)
            throw new ConflictException("Архивный счет недоступен для новых операций. Разархивируйте счет, чтобы продолжить.");
    }
}
