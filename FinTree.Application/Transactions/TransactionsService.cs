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

namespace FinTree.Application.Transactions;

public sealed class TransactionsService(IAppDbContext context, ICurrentUser currentUser, CurrencyConverter currencyConverter)
{
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;
    private readonly record struct CategoryAccessMeta(bool IsMandatory, CategoryType Type);

    public Task<Guid> CreateAsync(CreateTransaction command, CancellationToken ct)
        => CreateAsync(currentUser.Id, command, ct);

    internal async Task<Guid> CreateAsync(Guid userId, CreateTransaction command, CancellationToken ct)
    {
        var account = await context.Accounts.FirstOrDefaultAsync(a => a.Id == command.AccountId, ct) ??
                      throw new NotFoundException(nameof(Account), command.AccountId);

        if (account.UserId != userId)
            throw new ForbiddenException();

        EnsureAccountIsActive(account);

        if (command.CategoryId.HasValue)
            await ValidateCategoryForTransactionTypeAsync(userId, command.CategoryId.Value, command.Type, ct);

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
            .Where(t => t.Account.UserId == currentUserId && !t.IsTransfer);

        if (filter.AccountId.HasValue)
            userTransactionsQuery = userTransactionsQuery.Where(t => t.AccountId == filter.AccountId.Value);
        else
            userTransactionsQuery = userTransactionsQuery.Where(t => t.Account.Type == AccountType.Bank);

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

        if (filter.IsMandatory.HasValue)
            userTransactionsQuery = userTransactionsQuery.Where(t => t.IsMandatory == filter.IsMandatory.Value);

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

        var rateByCurrencyAndDay = await currencyConverter.GetCrossRatesWithMetaAsync(
            normalizedTransactions.Select(t => (t.Money.CurrencyCode, t.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        var userTransactions = new List<TransactionDto>(normalizedTransactions.Count);

        foreach (var transaction in normalizedTransactions)
        {
            ct.ThrowIfCancellationRequested();

            var rateKey = (NormalizeCurrencyCode(transaction.Money.CurrencyCode), transaction.OccurredAtUtc.Date);
            var (rate, isApproximate) = rateByCurrencyAndDay[rateKey];
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
                transaction.Money.CurrencyCode,
                isApproximate,
                rate));
        }

        return new PagedResult<TransactionDto>(userTransactions, page, size, total);
    }

    internal async Task<int> GetDistinctExpenseDaysCountAsync(CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        return await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserId &&
                        !t.IsTransfer &&
                        t.Account.Type == AccountType.Bank &&
                        t.Type == TransactionType.Expense)
            .Select(t => t.OccurredAt.Date)
            .Distinct()
            .CountAsync(ct);
    }

    internal async Task<DateTime?> GetEarliestOccurredAtBeforeAsync(
        DateTime beforeUtc,
        bool excludeTransfers,
        bool excludeInvestmentAccounts = false,
        TransactionType? type = null,
        CancellationToken ct = default)
    {
        var query = context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUser.Id && t.OccurredAt < beforeUtc);

        if (excludeTransfers)
            query = query.Where(t => !t.IsTransfer);

        if (excludeInvestmentAccounts)
            query = query.Where(t => t.Account.Type == AccountType.Bank);

        if (type.HasValue)
            query = query.Where(t => t.Type == type.Value);

        var raw = await query
            .Select(t => (DateTime?)t.OccurredAt)
            .MinAsync(ct);

        return raw.HasValue ? NormalizeUtc(raw.Value) : null;
    }

    internal async Task<List<TransactionAnalyticsSnapshot>> GetTransactionSnapshotsAsync(
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        bool excludeTransfers = false,
        bool excludeInvestmentAccounts = false,
        TransactionType? type = null,
        IReadOnlyCollection<Guid>? accountIds = null,
        bool excludeArchivedAccounts = false,
        CancellationToken ct = default)
    {
        var currentUserId = currentUser.Id;
        var query = context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == currentUserId);

        if (excludeArchivedAccounts)
            query = query.Where(t => !t.Account.IsArchived);

        if (accountIds is not null)
        {
            if (accountIds.Count == 0)
                return [];

            query = query.Where(t => accountIds.Contains(t.AccountId));
        }

        if (excludeTransfers)
            query = query.Where(t => !t.IsTransfer);

        if (excludeInvestmentAccounts)
            query = query.Where(t => t.Account.Type == AccountType.Bank);

        if (type.HasValue)
            query = query.Where(t => t.Type == type.Value);

        if (fromUtc.HasValue)
            query = query.Where(t => t.OccurredAt >= fromUtc.Value);

        if (toUtc.HasValue)
            query = query.Where(t => t.OccurredAt < toUtc.Value);

        var rows = await query
            .Select(t => new
            {
                t.AccountId,
                t.CategoryId,
                t.Money,
                t.OccurredAt,
                t.Type,
                t.IsTransfer,
                t.IsMandatory
            })
            .ToListAsync(ct);

        return rows
            .Select(t => new TransactionAnalyticsSnapshot(
                t.AccountId,
                t.CategoryId,
                t.Money,
                NormalizeUtc(t.OccurredAt),
                t.Type,
                t.IsTransfer,
                t.IsMandatory))
            .ToList();
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

        if (command.CategoryId.HasValue)
            await ValidateCategoryForTransactionTypeAsync(currentUser.Id, command.CategoryId.Value, transaction.Type, ct);

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

        if (command.CategoryId.HasValue)
            await ValidateCategoryForTransactionTypeAsync(currentUser.Id, command.CategoryId.Value, transaction.Type, ct);

        if (transaction.AccountId != newAccount.Id)
            transaction.MoveToAccount(newAccount);

        var money = new Money(newAccount.CurrencyCode, command.Amount);
        transaction.Update(command.CategoryId, money, command.OccurredAt,
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

    private async Task<CategoryAccessMeta> EnsureCategoryAccessAsync(Guid userId, Guid categoryId, CancellationToken ct)
    {
        var categoryMeta = await context.TransactionCategories
            .AsNoTracking()
            .Where(c => c.Id == categoryId)
            .Select(c => new { c.Id, c.UserId, c.IsMandatory, c.Type })
            .SingleOrDefaultAsync(ct);

        if (categoryMeta is null)
            throw new NotFoundException("Категория", categoryId);

        if (categoryMeta.UserId != userId)
            throw new ForbiddenException();

        return new CategoryAccessMeta(categoryMeta.IsMandatory, categoryMeta.Type);
    }

    private async Task ValidateCategoryForTransactionTypeAsync(Guid userId, Guid categoryId, TransactionType transactionType, CancellationToken ct)
    {
        var categoryAccess = await EnsureCategoryAccessAsync(userId, categoryId, ct);
        EnsureCategoryTypeMatchesTransactionType(categoryAccess.Type, transactionType);
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
