using System.Globalization;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using FinTree.Application.Abstractions;
using FinTree.Application.Accounts;
using FinTree.Application.Transactions;
using FinTree.Application.Transactions.Dto;
using FinTree.Application.Users;
using FinTree.Domain.Categories;
using FinTree.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FinTree.Application.Telegram;

public sealed partial class TelegramOperationsService(
    IAppDbContext context,
    AccountsService accountsService,
    UserService userService,
    TransactionsService transactionsService,
    ILogger<TelegramOperationsService> logger)
{
    private const string StartMessage =
        "Формат ввода операций:\n" +
        "• Расход (по умолчанию): `2400 продукты`\n" +
        "• Доход: `+120000 зарплата`\n" +
        "• Перевод: `> @сбер @нал 5000`\n" +
        "Дополнительно: `/format` (шпаргалка), `/accounts` (счета), `/id` (Telegram ID).";

    private const string FormatGuideMessage =
        "Как писать операции:\n" +
        "\n" +
        "1) Расход (по умолчанию):\n" +
        "`2400 продукты`\n" +
        "`2400 @нал продукты кофе 09.01.2026`\n" +
        "\n" +
        "2) Доход (префикс +):\n" +
        "`+120000 зарплата`\n" +
        "`+50000 @сбер фриланс проект 09.01.2026`\n" +
        "\n" +
        "3) Перевод (префикс >):\n" +
        "`> @сбер @нал 5000`\n" +
        "`> @сбер @binance 50000/520 ~100 обмен 09.01.2026`\n" +
        "\n" +
        "Правила:\n" +
        "• Одна строка = одна операция\n" +
        "• Дата всегда последним аргументом (dd.MM.yyyy)\n" +
        "• Если счет не указан, используется основной\n" +
        "• Счета с `@` резолвятся по частичному совпадению имени\n" +
        "• Для просмотра счетов и подсказок: `/accounts`";

    private const string MainAccountMissingMessage =
        "Основной счёт не назначен. Выберите основной счёт в приложении и повторите.";

    private const string NoAccountsMessage =
        "Нет активных счетов. Создайте или разархивируйте счет в приложении и повторите.";

    private const string NoExpenseCategoriesMessage =
        "Не нашёл категории расходов. Проверьте категории в профиле.";

    private const string NoIncomeCategoriesMessage =
        "Не нашёл категории доходов. Проверьте категории в профиле.";

    private const string SubscriptionRequiredMessage =
        "Подписка неактивна. Сейчас доступен только просмотр. Нажмите «Оплатить» в профиле FinTree, чтобы снова добавлять операции.";

    private const string SaveFailedMessage =
        "❌ Не удалось сохранить операции. Попробуйте позже.";

    private static readonly string[] LineSeparators = ["\r\n", "\n"];

    private sealed record TelegramUserContext(
        Guid UserId,
        DateTime? SubscriptionExpiresAtUtc);

    private sealed record AccountRef(Guid Id, string Name, string CurrencyCode, bool IsMain);

    private sealed record CategoryRef(Guid Id, string Name, CategoryType Type, bool IsDefault, bool IsMandatory);

    private sealed record OperationResult(int LineNumber, string Summary, IReadOnlyList<string> Details);

    private abstract record ParsedOperation(int LineNumber, DateTime OccurredAt);

    private sealed record ParsedTransaction(
        int LineNumber,
        DateTime OccurredAt,
        TransactionType Type,
        decimal Amount,
        string? AccountQuery,
        string CategoryName,
        string? Note)
        : ParsedOperation(LineNumber, OccurredAt);

    private sealed record ParsedTransfer(
        int LineNumber,
        DateTime OccurredAt,
        string FromAccountQuery,
        string ToAccountQuery,
        decimal FromAmount,
        decimal ToAmount,
        decimal? FeeAmount,
        string? Note)
        : ParsedOperation(LineNumber, OccurredAt);

    private abstract record ResolvedOperation(int LineNumber, DateTime OccurredAt);

    private sealed record ResolvedTransaction(
        int LineNumber,
        DateTime OccurredAt,
        TransactionType Type,
        AccountRef Account,
        CategoryRef? Category,
        decimal Amount,
        string? Description)
        : ResolvedOperation(LineNumber, OccurredAt);

    private sealed record ResolvedTransfer(
        int LineNumber,
        DateTime OccurredAt,
        AccountRef FromAccount,
        AccountRef ToAccount,
        decimal FromAmount,
        decimal ToAmount,
        decimal? FeeAmount,
        string? Description)
        : ResolvedOperation(LineNumber, OccurredAt);

    public TelegramResponse GetStartResponse()
        => new(StartMessage, TelegramTextFormat.Markdown);

    public TelegramResponse GetFormatResponse()
        => new(FormatGuideMessage, TelegramTextFormat.Markdown);

    public TelegramResponse GetExpenseFormatResponse()
        => new("Расход (по умолчанию): `2400 продукты` или `2400 @нал продукты кофе 09.01.2026`", TelegramTextFormat.Markdown);

    public TelegramResponse GetIncomeFormatResponse()
        => new("Доход: `+120000 зарплата` или `+50000 @сбер фриланс проект 09.01.2026`", TelegramTextFormat.Markdown);

    public TelegramResponse GetTransferFormatResponse()
        => new("Перевод: `> @сбер @нал 5000` или `> @сбер @binance 50000/520 ~100 обмен 09.01.2026`", TelegramTextFormat.Markdown);

    public TelegramResponse GetUnknownCommandResponse()
        => new("Неизвестная команда. Используйте `/format`.", TelegramTextFormat.Markdown);

    public TelegramResponse BuildUserNotFoundResponse()
        => new("Не нашёл привязанный аккаунт. Укажите ваш Telegram ID в профиле FinTree и попробуйте ещё раз.");

    public async Task<TelegramResponse> BuildAccountsResponseAsync(long telegramUserId, CancellationToken ct)
    {
        var user = await GetUserContextAsync(telegramUserId, ct);
        if (user is null)
            return BuildUserNotFoundResponse();

        var accounts = await LoadAccountsAsync(user.UserId, ct);
        if (accounts.Count == 0)
            return new TelegramResponse(NoAccountsMessage);

        var aliases = BuildAliases(accounts);

        var lines = new List<string>
        {
            "<b>Ваши активные счета:</b>"
        };

        foreach (var account in accounts)
        {
            var mainMarker = account.IsMain ? "⭐ " : string.Empty;
            var alias = aliases[account.Id];
            lines.Add($"• {mainMarker}{Escape(account.Name)} ({Escape(account.CurrencyCode)}) — <code>@{Escape(alias)}</code>");
        }

        lines.Add(string.Empty);
        lines.Add("Можно указывать любую часть имени после <code>@</code>.");
        lines.Add("Пример: <code>2400 @сбер продукты</code>.");

        return new TelegramResponse(string.Join("\n", lines), TelegramTextFormat.Html);
    }

    public async Task<TelegramResponse> ProcessOperationsAsync(long telegramUserId, string text, CancellationToken ct)
    {
        if (!TryParseOperations(text, out var parsedOperations, out var invalidLines))
            return BuildFormatErrorResponse(invalidLines);

        var user = await GetUserContextAsync(telegramUserId, ct);
        if (user is null)
            return BuildUserNotFoundResponse();

        if (!HasActiveSubscription(user.SubscriptionExpiresAtUtc))
            return new TelegramResponse(SubscriptionRequiredMessage);

        var accounts = await LoadAccountsAsync(user.UserId, ct);
        if (accounts.Count == 0)
            return new TelegramResponse(NoAccountsMessage);

        var categories = await LoadCategoriesAsync(user.UserId, ct);
        var expenseCategories = categories.Where(c => c.Type == CategoryType.Expense).ToList();
        var incomeCategories = categories.Where(c => c.Type == CategoryType.Income).ToList();

        if (expenseCategories.Count == 0)
            return new TelegramResponse(NoExpenseCategoriesMessage);

        if (incomeCategories.Count == 0)
            return new TelegramResponse(NoIncomeCategoriesMessage);

        if (!TryResolveOperations(parsedOperations, accounts, expenseCategories, incomeCategories, out var resolvedOperations,
                out var resolveError))
        {
            return new TelegramResponse(resolveError);
        }

        try
        {
            var results = await ExecuteOperationsAsync(user.UserId, resolvedOperations, ct);
            return BuildSuccessResponse(results);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ошибка при сохранении операций из Telegram");
            return new TelegramResponse(SaveFailedMessage);
        }
    }

    private static bool HasActiveSubscription(DateTime? expiresAtUtc)
        => expiresAtUtc is { } value && value > DateTime.UtcNow;

    private static TelegramResponse BuildFormatErrorResponse(IReadOnlyCollection<int> invalidLines)
    {
        var suffix = invalidLines.Count > 0
            ? $" (строки: {string.Join(", ", invalidLines)})"
            : string.Empty;

        var message =
            $"Не удалось распознать формат{suffix}.\n" +
            "Используйте `/format` для полной шпаргалки.\n" +
            "По умолчанию строка без префикса `+`/`>` считается расходом.";

        return new TelegramResponse(message, TelegramTextFormat.Markdown);
    }

    private async Task<TelegramUserContext?> GetUserContextAsync(long telegramUserId, CancellationToken ct)
    {
        return await context.Users
            .AsNoTracking()
            .Where(u => u.TelegramUserId == telegramUserId)
            .Select(u => new TelegramUserContext(u.Id, u.SubscriptionExpiresAtUtc))
            .FirstOrDefaultAsync(ct);
    }

    private async Task<List<AccountRef>> LoadAccountsAsync(Guid userId, CancellationToken ct)
    {
        var accounts = await accountsService.GetAccountsAsync(userId, ct: ct);

        return accounts
            .Select(a => new AccountRef(a.Id, a.Name, a.CurrencyCode, a.IsMain))
            .ToList();
    }

    private async Task<List<CategoryRef>> LoadCategoriesAsync(Guid userId, CancellationToken ct)
    {
        var categories = await userService.GetUserCategoriesAsync(userId, ct);

        var defaults = await context.TransactionCategories
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .Select(c => new { c.Id, c.IsDefault })
            .ToDictionaryAsync(x => x.Id, x => x.IsDefault, ct);

        return categories
            .Select(c => new CategoryRef(c.Id, c.Name, c.Type, defaults.GetValueOrDefault(c.Id), c.IsMandatory))
            .ToList();
    }

    private static Dictionary<Guid, string> BuildAliases(IReadOnlyList<AccountRef> accounts)
    {
        var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var result = new Dictionary<Guid, string>();

        for (var i = 0; i < accounts.Count; i++)
        {
            var account = accounts[i];
            var aliasBase = BuildAliasBase(account.Name);
            if (string.IsNullOrWhiteSpace(aliasBase))
                aliasBase = $"acc{i + 1}";

            var alias = aliasBase;
            var suffix = 2;
            while (!used.Add(alias))
            {
                alias = $"{aliasBase}{suffix}";
                suffix++;
            }

            result[account.Id] = alias;
        }

        return result;
    }

    private static string BuildAliasBase(string name)
    {
        var sb = new StringBuilder();

        foreach (var ch in name.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch))
                sb.Append(ch);
        }

        var value = sb.ToString();
        return value.Length <= 16 ? value : value[..16];
    }

    private static bool TryParseOperations(string text, out List<ParsedOperation> parsedOperations, out List<int> invalidLines)
    {
        var lines = SplitLines(text);
        parsedOperations = new List<ParsedOperation>(lines.Count);
        invalidLines = [];

        for (var i = 0; i < lines.Count; i++)
        {
            var lineNumber = i + 1;
            if (!TryParseLine(lines[i], lineNumber, out var operation))
            {
                invalidLines.Add(lineNumber);
                continue;
            }

            parsedOperations.Add(operation);
        }

        return parsedOperations.Count > 0 && invalidLines.Count == 0;
    }

    private static bool TryParseLine(string line, int lineNumber, out ParsedOperation operation)
    {
        operation = default!;

        var tokens = line.Split(' ', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToList();
        if (tokens.Count == 0)
            return false;

        var occurredAt = DateTime.UtcNow;
        if (tokens.Count > 1 && TryParseOccurredAt(tokens[^1], out var parsedDate))
        {
            occurredAt = parsedDate;
            tokens.RemoveAt(tokens.Count - 1);
            if (tokens.Count == 0)
                return false;
        }

        var first = tokens[0];

        if (first.StartsWith('>'))
        {
            if (first.Length > 1)
                tokens[0] = first[1..];
            else
                tokens.RemoveAt(0);

            return TryParseTransferLine(tokens, lineNumber, occurredAt, out operation);
        }

        if (first.StartsWith('+'))
        {
            var amountToken = first[1..];
            tokens.RemoveAt(0);
            return TryParseTransactionLine(tokens, lineNumber, occurredAt, TransactionType.Income, amountToken, out operation);
        }

        tokens.RemoveAt(0);
        return TryParseTransactionLine(tokens, lineNumber, occurredAt, TransactionType.Expense, first, out operation);
    }

    private static bool TryParseTransactionLine(
        IReadOnlyList<string> tokens,
        int lineNumber,
        DateTime occurredAt,
        TransactionType type,
        string amountToken,
        out ParsedOperation operation)
    {
        operation = default!;

        if (!TryParseAmount(amountToken, out var amount) || amount <= 0)
            return false;

        var remaining = tokens.ToList();

        string? accountQuery = null;
        if (remaining.Count > 0 && TryParseAccountQueryToken(remaining[0], out var parsedAccountQuery))
        {
            accountQuery = parsedAccountQuery;
            remaining.RemoveAt(0);
        }

        if (remaining.Count == 0)
            return false;

        var categoryName = remaining[0];
        if (string.IsNullOrWhiteSpace(categoryName))
            return false;

        var note = remaining.Count > 1 ? string.Join(' ', remaining[1..]) : null;

        operation = new ParsedTransaction(lineNumber, occurredAt, type, amount, accountQuery, categoryName, note);
        return true;
    }

    private static bool TryParseTransferLine(
        IReadOnlyList<string> tokens,
        int lineNumber,
        DateTime occurredAt,
        out ParsedOperation operation)
    {
        operation = default!;

        if (tokens.Count < 3)
            return false;

        if (!TryParseAccountQueryToken(tokens[0], out var fromAccountQuery))
            return false;

        if (!TryParseAccountQueryToken(tokens[1], out var toAccountQuery))
            return false;

        if (!TryParseTransferAmounts(tokens[2], out var fromAmount, out var toAmount))
            return false;

        var remaining = tokens.Skip(3).ToList();

        decimal? feeAmount = null;
        var feeIndex = remaining.FindIndex(token => token.StartsWith('~'));
        if (feeIndex >= 0)
        {
            var rawFee = remaining[feeIndex][1..];
            if (!TryParseAmount(rawFee, out var parsedFee) || parsedFee < 0)
                return false;

            feeAmount = parsedFee == 0 ? null : parsedFee;
            remaining.RemoveAt(feeIndex);
        }

        var note = remaining.Count > 0 ? string.Join(' ', remaining) : null;

        operation = new ParsedTransfer(
            lineNumber,
            occurredAt,
            fromAccountQuery,
            toAccountQuery,
            fromAmount,
            toAmount,
            feeAmount,
            note);

        return true;
    }

    private static bool TryParseTransferAmounts(string token, out decimal fromAmount, out decimal toAmount)
    {
        fromAmount = 0;
        toAmount = 0;

        var parts = token.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (parts.Length == 1)
        {
            if (!TryParseAmount(parts[0], out fromAmount) || fromAmount <= 0)
                return false;

            toAmount = fromAmount;
            return true;
        }

        if (parts.Length != 2)
            return false;

        if (!TryParseAmount(parts[0], out fromAmount) || fromAmount <= 0)
            return false;

        if (!TryParseAmount(parts[1], out toAmount) || toAmount <= 0)
            return false;

        return true;
    }

    private static bool TryResolveOperations(
        IEnumerable<ParsedOperation> parsedOperations,
        IReadOnlyList<AccountRef> accounts,
        IReadOnlyList<CategoryRef> expenseCategories,
        IReadOnlyList<CategoryRef> incomeCategories,
        out List<ResolvedOperation> resolvedOperations,
        out string errorMessage)
    {
        resolvedOperations = [];
        errorMessage = string.Empty;

        var mainAccount = accounts.FirstOrDefault(a => a.IsMain);

        foreach (var parsedOperation in parsedOperations)
        {
            switch (parsedOperation)
            {
                case ParsedTransaction parsedTransaction:
                {
                    if (!TryResolveAccount(accounts, mainAccount, parsedTransaction.AccountQuery, out var account,
                            out var accountResolveError))
                    {
                        errorMessage = $"Строка {parsedTransaction.LineNumber}: {accountResolveError}";
                        return false;
                    }

                    var categories = parsedTransaction.Type == TransactionType.Expense ? expenseCategories : incomeCategories;
                    var category = parsedTransaction.Type == TransactionType.Expense
                        ? ResolveExpenseCategory(categories, parsedTransaction.CategoryName)
                        : ResolveIncomeCategory(categories, parsedTransaction.CategoryName);

                    var rawNote = category is null
                        ? $"{parsedTransaction.CategoryName} {parsedTransaction.Note}".Trim()
                        : parsedTransaction.Note;
                    var description = NormalizeNote(rawNote);

                    resolvedOperations.Add(new ResolvedTransaction(
                        parsedTransaction.LineNumber,
                        parsedTransaction.OccurredAt,
                        parsedTransaction.Type,
                        account,
                        category,
                        parsedTransaction.Amount,
                        description));
                    break;
                }
                case ParsedTransfer parsedTransfer:
                {
                    if (!TryResolveAccount(accounts, mainAccount, parsedTransfer.FromAccountQuery, out var fromAccount,
                            out var fromResolveError))
                    {
                        errorMessage = $"Строка {parsedTransfer.LineNumber}: {fromResolveError}";
                        return false;
                    }

                    if (!TryResolveAccount(accounts, mainAccount, parsedTransfer.ToAccountQuery, out var toAccount,
                            out var toResolveError))
                    {
                        errorMessage = $"Строка {parsedTransfer.LineNumber}: {toResolveError}";
                        return false;
                    }

                    if (fromAccount.Id == toAccount.Id)
                    {
                        errorMessage = $"Строка {parsedTransfer.LineNumber}: счета перевода должны быть разными.";
                        return false;
                    }

                    resolvedOperations.Add(new ResolvedTransfer(
                        parsedTransfer.LineNumber,
                        parsedTransfer.OccurredAt,
                        fromAccount,
                        toAccount,
                        parsedTransfer.FromAmount,
                        parsedTransfer.ToAmount,
                        parsedTransfer.FeeAmount,
                        NormalizeNote(parsedTransfer.Note)));
                    break;
                }
                default:
                    errorMessage = "Не удалось обработать операции.";
                    return false;
            }
        }

        return true;
    }

    private static bool TryResolveAccount(
        IReadOnlyList<AccountRef> accounts,
        AccountRef? mainAccount,
        string? accountQuery,
        out AccountRef account,
        out string errorMessage)
    {
        errorMessage = string.Empty;

        if (string.IsNullOrWhiteSpace(accountQuery))
        {
            if (mainAccount is null)
            {
                account = default!;
                errorMessage = MainAccountMissingMessage;
                return false;
            }

            account = mainAccount;
            return true;
        }

        var query = accountQuery.Trim();

        var exactMatch = accounts
            .FirstOrDefault(a => string.Equals(a.Name, query, StringComparison.OrdinalIgnoreCase));
        if (exactMatch is not null)
        {
            account = exactMatch;
            return true;
        }

        var prefixMatches = accounts
            .Where(a => a.Name.StartsWith(query, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (prefixMatches.Count == 1)
        {
            account = prefixMatches[0];
            return true;
        }

        if (prefixMatches.Count > 1)
        {
            account = default!;
            errorMessage = BuildAmbiguousAccountError(query, prefixMatches.Select(m => m.Name).ToList());
            return false;
        }

        var containsMatches = accounts
            .Where(a => a.Name.Contains(query, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (containsMatches.Count == 1)
        {
            account = containsMatches[0];
            return true;
        }

        if (containsMatches.Count > 1)
        {
            account = default!;
            errorMessage = BuildAmbiguousAccountError(query, containsMatches.Select(m => m.Name).ToList());
            return false;
        }

        account = default!;
        errorMessage = $"не нашёл счёт «{query}». Используйте `/accounts` для подсказок.";
        return false;
    }

    private static string BuildAmbiguousAccountError(string query, IReadOnlyList<string> matches)
    {
        var examples = matches.Take(3).ToList();
        var suffix = matches.Count > 3 ? ", ..." : string.Empty;
        return $"неоднозначный счёт «{query}». Подходят: {string.Join(", ", examples)}{suffix}.";
    }

    private static CategoryRef? ResolveExpenseCategory(IReadOnlyList<CategoryRef> categories, string categoryName)
    {
        var normalized = categoryName.Trim();

        var exactMatch = categories
            .FirstOrDefault(c => string.Equals(c.Name, normalized, StringComparison.OrdinalIgnoreCase));
        if (exactMatch is not null)
            return exactMatch;

        var prefixMatches = categories
            .Where(c => c.Name.StartsWith(normalized, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (prefixMatches.Count == 1)
            return prefixMatches[0];

        var containsMatches = categories
            .Where(c => c.Name.Contains(normalized, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (containsMatches.Count == 1)
            return containsMatches[0];

        return null;
    }

    private static CategoryRef? ResolveIncomeCategory(IReadOnlyList<CategoryRef> categories, string categoryName)
    {
        var normalized = categoryName.Trim();

        var exactMatch = categories
            .FirstOrDefault(c => string.Equals(c.Name, normalized, StringComparison.OrdinalIgnoreCase));
        if (exactMatch is not null)
            return exactMatch;

        var prefixMatches = categories
            .Where(c => c.Name.StartsWith(normalized, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (prefixMatches.Count == 1)
            return prefixMatches[0];

        var containsMatches = categories
            .Where(c => c.Name.Contains(normalized, StringComparison.OrdinalIgnoreCase))
            .ToList();

        return containsMatches.Count == 1 ? containsMatches[0] : null;
    }

private async Task<List<OperationResult>> ExecuteOperationsAsync(
        Guid userId,
        IReadOnlyList<ResolvedOperation> resolvedOperations,
        CancellationToken ct)
    {
        var results = new List<OperationResult>(resolvedOperations.Count);

        await using var transaction = await context.BeginTransactionAsync(ct);

        foreach (var resolvedOperation in resolvedOperations.OrderBy(x => x.LineNumber))
        {
            switch (resolvedOperation)
            {
                case ResolvedTransaction resolvedTransaction:
                    await transactionsService.CreateAsync(
                        userId,
                        new CreateTransaction(
                            resolvedTransaction.Type,
                            resolvedTransaction.Account.Id,
                            resolvedTransaction.Amount,
                            resolvedTransaction.OccurredAt,
                            resolvedTransaction.Category?.Id,
                            resolvedTransaction.Description,
                            resolvedTransaction is { Type: TransactionType.Expense } && resolvedTransaction.Category?.IsMandatory == true),
                        ct);

                    results.Add(BuildTransactionResult(resolvedTransaction));
                    break;

                default:
                    throw new InvalidOperationException("Unsupported operation type.");
            }
        }

        await transaction.CommitAsync(ct);
        return results;
    }

    private static OperationResult BuildTransactionResult(ResolvedTransaction transaction)
    {
        var operationLabel = transaction.Type == TransactionType.Expense ? "Расход" : "Доход";
        var categoryName = transaction.Category?.Name ?? "Без категории";
        var summary =
            $"[{transaction.LineNumber}] {operationLabel}: {categoryName} — {FormatAmount(transaction.Account.CurrencyCode, transaction.Amount)} ({transaction.Account.Name})";

        var details = new List<string>
        {
            $"✅ {operationLabel} добавлен",
            $"💳 Счёт: {transaction.Account.Name} ({transaction.Account.CurrencyCode})",
            $"📂 Категория: {categoryName}",
            $"💰 Сумма: {FormatAmount(transaction.Account.CurrencyCode, transaction.Amount)}",
            $"📅 Дата: {FormatDate(transaction.OccurredAt)}"
        };

        if (!string.IsNullOrWhiteSpace(transaction.Description))
            details.Add($"📝 Заметка: {transaction.Description}");

        return new OperationResult(transaction.LineNumber, summary, details);
    }

    private static OperationResult BuildTransferResult(ResolvedTransfer transfer)
    {
        var summary =
            $"[{transfer.LineNumber}] Перевод: {transfer.FromAccount.Name} -> {transfer.ToAccount.Name} ({FormatAmount(transfer.FromAccount.CurrencyCode, transfer.FromAmount)} -> {FormatAmount(transfer.ToAccount.CurrencyCode, transfer.ToAmount)})";

        var details = new List<string>
        {
            "Перевод добавлен",
            $"Со счёта: {transfer.FromAccount.Name} ({transfer.FromAccount.CurrencyCode})",
            $"На счёт: {transfer.ToAccount.Name} ({transfer.ToAccount.CurrencyCode})",
            $"Списание: {FormatAmount(transfer.FromAccount.CurrencyCode, transfer.FromAmount)}",
            $"Зачисление: {FormatAmount(transfer.ToAccount.CurrencyCode, transfer.ToAmount)}",
            $"Комиссия: {FormatAmount(transfer.FromAccount.CurrencyCode, transfer.FeeAmount ?? 0m)}",
            $"Дата: {FormatDate(transfer.OccurredAt)}"
        };

        if (!string.IsNullOrWhiteSpace(transfer.Description))
            details.Add($"Заметка: {transfer.Description}");

        return new OperationResult(transfer.LineNumber, summary, details);
    }

    private static TelegramResponse BuildSuccessResponse(IReadOnlyList<OperationResult> results)
    {
        if (results.Count == 1)
        {
            var result = results[0];
            var lines = new List<string>();
            lines.AddRange(result.Details.Select(Escape));
            return new TelegramResponse(string.Join("\n", lines), TelegramTextFormat.Html);
        }

        var batchLines = new List<string> { $"✅ Добавлено операций: {results.Count}" };
        batchLines.AddRange(results.OrderBy(r => r.LineNumber).Select(r => $"• {Escape(r.Summary)}"));
        return new TelegramResponse(string.Join("\n", batchLines), TelegramTextFormat.Html);
    }

    private static bool TryParseAccountQueryToken(string token, out string query)
    {
        query = string.Empty;

        if (!token.StartsWith('@'))
            return false;

        var normalized = token[1..].Trim().Trim(',', ';', '.');
        if (string.IsNullOrWhiteSpace(normalized))
            return false;

        query = normalized;
        return true;
    }

    private static IReadOnlyList<string> SplitLines(string text)
        => text.Split(LineSeparators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static string? NormalizeNote(string? note)
    {
        if (string.IsNullOrWhiteSpace(note))
            return null;

        var normalized = note.Trim();
        return normalized.Length <= 100 ? normalized : normalized[..100];
    }

    private static bool TryParseAmount(string raw, out decimal amount)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            amount = 0;
            return false;
        }

        var cleaned = raw
            .Replace(" ", string.Empty)
            .Replace("\u00A0", string.Empty)
            .Trim();

        var match = AmountRegexCompiled().Match(cleaned);
        if (!match.Success)
        {
            amount = 0;
            return false;
        }

        var normalized = match.Groups["value"].Value.Replace(',', '.');
        return decimal.TryParse(normalized, NumberStyles.Number, CultureInfo.InvariantCulture, out amount);
    }

    private static bool TryParseOccurredAt(string raw, out DateTime occurredAt)
    {
        var formats = new[] { "dd.MM.yyyy", "d.M.yyyy", "d.MM.yyyy", "dd.M.yyyy" };
        if (!DateTime.TryParseExact(raw, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            occurredAt = default;
            return false;
        }

        occurredAt = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
        return true;
    }

    private static string FormatAmount(string currencyCode, decimal amount)
        => $"{amount:0.##} {currencyCode}";

    private static string FormatDate(DateTime date)
        => date.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture);

    private static string Escape(string value)
        => WebUtility.HtmlEncode(value);

[GeneratedRegex("^(?<value>[0-9]+(?:[.,][0-9]+)?)", RegexOptions.Compiled)]
    private static partial Regex AmountRegexCompiled();
}
