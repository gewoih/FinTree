using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using FinTree.Domain.Accounts;
using FinTree.Domain.Categories;
using FinTree.Domain.Transactions;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using User = FinTree.Domain.Identity.User;

namespace FinTree.Infrastructure.Telegram;

public partial class TelegramBotHostedService(
    TelegramBotClient botClient,
    IServiceProvider serviceProvider,
    ILogger<TelegramBotHostedService> logger)
    : BackgroundService
{
    private const string StartMessage =
        "Как добавить расход:\n" +
        "• Одна строка = один расход\n" +
        "• Формат: `{сумма}{валюта?} {категория} {заметка?} {дата?}`\n" +
        "Примеры:\n" +
        "`2400тг продукты`\n" +
        "`3000р комиссии сбербанк 09.01.2026`\n" +
        "Команда `/id` покажет ваш Telegram ID для привязки в профиле.";

    private const string FormatErrorMessage =
        "Не удалось распознать формат{0}.\n" +
        "Формат: `2400тг продукты` или `3000р комиссии сбербанк 09.01.2026`.\n" +
        "Подсказка: сумму и валюту пиши слитно (например, `2400тг`), дату — последним аргументом (dd.MM.yyyy).";

    private const string UserNotFoundMessage =
        "Не нашёл привязанный аккаунт. Укажите ваш Telegram ID в профиле FinTree и попробуйте ещё раз.";

    private const string MainAccountMissingMessage =
        "Основной счёт не назначен. Выберите основной счёт в приложении и повторите.";

    private const string DefaultCategoryMissingMessage =
        "Не получилось подобрать категорию. Проверьте, что есть категории расходов и одна из них — по умолчанию.";

    private const string SubscriptionRequiredMessage =
        "Подписка неактивна. Сейчас доступен только просмотр. Нажмите «Оплатить» в профиле FinTree, чтобы снова добавлять операции.";

    private static readonly string[] LineSeparators = ["\r\n", "\n"];

    private sealed record ParsedExpense(decimal Amount, string CategoryName, string? Note, DateTime OccurredAt);
    private sealed record ResolvedExpense(decimal Amount, TransactionCategory Category, string? Description, DateTime OccurredAt);

    private readonly ReceiverOptions _receiverOptions = new()
    {
        AllowedUpdates = [UpdateType.Message]
    };

    private readonly BotCommand[] _availableCommands =
    [
        new() { Command = "expense", Description = "Добавить расход" },
        new() { Command = "id", Description = "Показать Telegram ID" }
    ];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        botClient.StartReceiving(HandleUpdateAsync, HandleErrorAsync, _receiverOptions, stoppingToken);
        await RegisterCommandsAsync(stoppingToken);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private Task HandleErrorAsync(ITelegramBotClient arg1, Exception arg2, CancellationToken arg3)
    {
        logger.LogError(arg2, "Ошибка Telegram API");
        return Task.CompletedTask;
    }

    private async Task HandleUpdateAsync(ITelegramBotClient bot, Update update, CancellationToken ct)
    {
        try
        {
            if (update.Message is { Type: MessageType.Text } message)
                await OnMessage(message, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "HandleUpdate failed");
        }
    }

    private async Task OnMessage(Message msg, CancellationToken ct)
    {
        await using var scope = serviceProvider.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var chatId = msg.Chat.Id;
        var text = (msg.Text ?? string.Empty).Trim();

        if (IsStartCommand(text))
        {
            await botClient.SendMessage(chatId, StartMessage, parseMode: ParseMode.Markdown, cancellationToken: ct);
            return;
        }

        if (IsIdCommand(text))
        {
            if (msg.From is not null)
            {
                var idValue = msg.From.Id.ToString(CultureInfo.InvariantCulture);
                await botClient.SendMessage(chatId, $"Ваш Telegram ID: {idValue}", cancellationToken: ct);
            }
            return;
        }

        if (!TryParseExpenses(text, out var parsedExpenses, out var invalidLines))
        {
            await SendFormatErrorAsync(chatId, invalidLines, ct);
            return;
        }

        var user = await GetUserAsync(msg, context, ct);
        if (user is null)
        {
            await botClient.SendMessage(chatId, UserNotFoundMessage, cancellationToken: ct);
            return;
        }

        if (!user.HasActiveSubscription(DateTime.UtcNow))
        {
            await botClient.SendMessage(chatId, SubscriptionRequiredMessage, cancellationToken: ct);
            return;
        }

        var account = GetMainAccount(user);
        if (account is null)
        {
            await botClient.SendMessage(chatId, MainAccountMissingMessage, cancellationToken: ct);
            return;
        }

        var categories = await GetExpenseCategoriesAsync(context, user.Id, ct);
        if (!TryResolveExpenses(parsedExpenses, categories, out var resolvedExpenses))
        {
            await botClient.SendMessage(chatId, DefaultCategoryMissingMessage, cancellationToken: ct);
            return;
        }

        try
        {
            AddTransactions(account, resolvedExpenses);

            await context.SaveChangesAsync(ct);

            await SendSuccessResponseAsync(chatId, account, resolvedExpenses, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ошибка при сохранении расхода");
            await botClient.SendMessage(chatId, "❌ Не удалось сохранить расход. Попробуйте позже.",
                cancellationToken: ct);
        }
    }

    private async Task RegisterCommandsAsync(CancellationToken ct)
    {
        try
        {
            await botClient.SetMyCommands(_availableCommands, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Не удалось установить команды бота");
        }
    }

    private async Task SendFormatErrorAsync(long chatId, IReadOnlyCollection<int> invalidLines, CancellationToken ct)
    {
        var suffix = invalidLines.Count > 0
            ? $" (строки: {string.Join(", ", invalidLines)})"
            : string.Empty;

        var message = string.Format(CultureInfo.InvariantCulture, FormatErrorMessage, suffix);
        await botClient.SendMessage(chatId, message, parseMode: ParseMode.Markdown, cancellationToken: ct);
    }

    private async Task SendSuccessResponseAsync(long chatId, Account account, IReadOnlyList<ResolvedExpense> expenses,
        CancellationToken ct)
    {
        var response = expenses.Count == 1
            ? BuildSingleExpenseResponse(account, expenses[0])
            : BuildBatchExpenseResponse(account, expenses);

        await botClient.SendMessage(chatId, response, ParseMode.Html, cancellationToken: ct);
    }

    private static async Task<User?> GetUserAsync(Message msg, AppDbContext context, CancellationToken ct)
    {
        if (msg.From is null)
            return null;

        var telegramUserId = msg.From.Id;

        return await context.Users
            .Include(u => u.Accounts)
            .Where(u => u.TelegramUserId == telegramUserId)
            .FirstOrDefaultAsync(cancellationToken: ct);
    }

    private static Account? GetMainAccount(User user)
        => user.Accounts.FirstOrDefault(a => a.IsMain);

    private static bool IsStartCommand(string text)
        => text.Equals("/start", StringComparison.OrdinalIgnoreCase);

    private static bool IsIdCommand(string text)
        => text.Equals("/id", StringComparison.OrdinalIgnoreCase);

    private static IReadOnlyList<string> SplitLines(string text)
        => text.Split(LineSeparators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static TransactionCategory? ResolveCategory(IReadOnlyList<TransactionCategory> categories,
        string categoryName)
    {
        var normalized = categoryName.Trim();
        var exactMatch = categories
            .FirstOrDefault(c => string.Equals(c.Name, normalized, StringComparison.OrdinalIgnoreCase));
        if (exactMatch is not null)
            return exactMatch;

        var prefixMatches = categories
            .Where(c => c.Name.StartsWith(normalized, StringComparison.OrdinalIgnoreCase))
            .ToList();

        return prefixMatches.Count == 1
            ? prefixMatches[0]
            : categories.FirstOrDefault(c => c.IsDefault);
    }

    private static async Task<List<TransactionCategory>> GetExpenseCategoriesAsync(AppDbContext context, Guid userId,
        CancellationToken ct)
    {
        return await context.TransactionCategories
            .Where(t => t.Type == CategoryType.Expense)
            .Where(t => t.UserId == userId)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    private static bool TryParseExpenses(string text, out List<ParsedExpense> expenses, out List<int> invalidLines)
    {
        var lines = SplitLines(text);
        expenses = new List<ParsedExpense>(lines.Count);
        invalidLines = [];

        for (var i = 0; i < lines.Count; i++)
        {
            if (!TryParseExpense(lines[i], out var amount, out var categoryName, out var note, out var occurredAt))
            {
                invalidLines.Add(i + 1);
                continue;
            }

            expenses.Add(new ParsedExpense(amount, categoryName, note, occurredAt));
        }

        return expenses.Count > 0 && invalidLines.Count == 0;
    }

    private static bool TryResolveExpenses(IEnumerable<ParsedExpense> parsedExpenses,
        IReadOnlyList<TransactionCategory> categories,
        out List<ResolvedExpense> resolvedExpenses)
    {
        resolvedExpenses = [];

        foreach (var expense in parsedExpenses)
        {
            var category = ResolveCategory(categories, expense.CategoryName);
            if (category is null)
                return false;

            var description = BuildDescription(expense.CategoryName, expense.Note, category.IsDefault);
            resolvedExpenses.Add(new ResolvedExpense(expense.Amount, category, description, expense.OccurredAt));
        }

        return true;
    }

    private static string? BuildDescription(string categoryName, string? note, bool isDefaultCategory)
    {
        var trimmedNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        if (!isDefaultCategory)
            return trimmedNote;

        var normalizedCategory = categoryName.Trim();
        return string.IsNullOrWhiteSpace(trimmedNote)
            ? normalizedCategory
            : $"{normalizedCategory} {trimmedNote}";
    }

    private static void AddTransactions(Account account, IEnumerable<ResolvedExpense> expenses)
    {
        foreach (var expense in expenses)
            account.AddTransaction(TransactionType.Expense, expense.Category.Id, expense.Amount, expense.OccurredAt,
                expense.Description);
    }

    private static bool TryParseExpense(string text, out decimal amount, out string category, out string? note,
        out DateTime occurredAt)
    {
        amount = 0;
        category = "";
        note = null;
        occurredAt = default;

        var parts = text.Split(' ', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2 || !TryParseAmount(parts[0], out amount) || amount <= 0)
            return false;

        category = parts[1];

        if (string.IsNullOrWhiteSpace(category))
            return false;

        if (parts.Length == 2)
        {
            occurredAt = DateTime.UtcNow;
            return true;
        }

        var dateToken = parts[^1];
        if (TryParseOccurredAt(dateToken, out occurredAt))
        {
            note = parts.Length > 3 ? string.Join(' ', parts[2..^1]) : null;
            return true;
        }

        occurredAt = DateTime.UtcNow;
        note = parts.Length > 2 ? string.Join(' ', parts[2..]) : null;

        return true;
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

    private static string BuildSingleExpenseResponse(Account account, ResolvedExpense expense)
    {
        var lines = new List<string>
        {
            "✅ Расход добавлен",
            $"💳 Счёт: {Escape(account.Name)} ({Escape(account.Currency.Code)})",
            $"📂 Категория: {Escape(expense.Category.Name)}",
            $"💰 Сумма: {FormatAmount(account, expense.Amount)}",
            $"📅 Дата: {FormatDate(expense.OccurredAt)}"
        };

        if (!string.IsNullOrWhiteSpace(expense.Description))
            lines.Add($"📝 Заметка: {Escape(expense.Description)}");

        return string.Join("\n", lines);
    }

    private static string BuildBatchExpenseResponse(Account account, IReadOnlyList<ResolvedExpense> expenses)
    {
        var lines = new List<string>
        {
            $"✅ Добавлено расходов: {expenses.Count}",
            $"💳 Счёт: {Escape(account.Name)} ({Escape(account.Currency.Code)})"
        };

        foreach (var expense in expenses)
        {
            var notePart = string.IsNullOrWhiteSpace(expense.Description)
                ? string.Empty
                : $" — {Escape(expense.Description)}";

            lines.Add(
                $"• {Escape(expense.Category.Name)}: {FormatAmount(account, expense.Amount)} — {FormatDate(expense.OccurredAt)}{notePart}");
        }

        return string.Join("\n", lines);
    }

    private static string FormatAmount(Account account, decimal amount)
        => Escape($"{amount:0.##} {account.Currency.Symbol}");

    private static string Escape(string value)
        => WebUtility.HtmlEncode(value);

    private static string FormatDate(DateTime date)
        => date.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture);

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

    [GeneratedRegex("^(?<value>[0-9]+(?:[.,][0-9]+)?)", RegexOptions.Compiled)]
    private static partial Regex AmountRegexCompiled();
}
