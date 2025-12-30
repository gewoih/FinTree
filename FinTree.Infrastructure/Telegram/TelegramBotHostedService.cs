using System.Globalization;
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
        "Пришли сообщение в формате:\n`{сумма}{валюта?}, {категория}, {заметка?}`\nНапример: `2400тг, продукты` или `3000р, комиссии, сбербанк`.";

    private readonly ReceiverOptions _receiverOptions = new()
    {
        AllowedUpdates = [UpdateType.Message]
    };

    private readonly BotCommand[] _availableCommands =
    [
        new() { Command = "expense", Description = "Добавить расход" }
    ];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        botClient.StartReceiving(HandleUpdateAsync, HandleErrorAsync, _receiverOptions, stoppingToken);
        await botClient.SetMyCommands(_availableCommands, cancellationToken: stoppingToken);

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

        if (!TryParseExpense(text, out var amount, out var categoryName, out var note))
        {
            await botClient.SendMessage(chatId,
                "Не понял формат. Пришли: `2400тг, продукты` или `3000р, комиссии, заметка`.",
                parseMode: ParseMode.Markdown,
                cancellationToken: ct);
            return;
        }

        var user = await GetUserAsync(msg, context, ct);
        if (user is null)
        {
            await botClient.SendMessage(chatId,
                "Не удалось найти аккаунт. Привяжите ваш Телеграм на сайте FinTree.",
                cancellationToken: ct);
            return;
        }

        var account = user.Accounts.FirstOrDefault(a => a.IsMain);
        if (account is null)
        {
            await botClient.SendMessage(chatId,
                "Основной счёт не найден. Создайте/назначьте основной счёт и повторите.",
                cancellationToken: ct);
            return;
        }

        var categories = await context.TransactionCategories
            .Where(t => t.Type == CategoryType.Expense)
            .Where(t => t.UserId == user.Id || t.UserId == null)
            .AsNoTracking()
            .ToListAsync(ct);

        var category = ResolveCategory(categories, categoryName);
        if (category is null)
        {
            await botClient.SendMessage(chatId,
                "Категория по умолчанию недоступна. Попробуйте позже.",
                cancellationToken: ct);
            return;
        }
        
        try
        {
            if (category.IsDefault)
                note = $"{categoryName} - {note}";
            
            var description = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
            account.AddTransaction(TransactionType.Expense, category.Id, amount, DateTime.UtcNow, description);
            await context.SaveChangesAsync(ct);

            var response =
                $"✅Добавлен расход:\n" +
                $"💳Счёт: {account.Name} ({account.Currency.Code})\n" +
                $"📂Категория: '{category.Name}'\n" +
                $"💰Сумма: {FormatAmount(amount, account)}\n" +
                (string.IsNullOrWhiteSpace(description) ? "" : $"📝Заметка: '{description}'");

            await botClient.SendMessage(chatId, response, ParseMode.Html, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ошибка при сохранении расхода");
            await botClient.SendMessage(chatId, "❌ Ошибка при сохранении. Попробуйте позже.", cancellationToken: ct);
        }
    }

    private static async Task<User?> GetUserAsync(Message msg, AppDbContext context, CancellationToken ct)
    {
        if (msg.From is null)
            return null;

        return await context.Users
            .Include(u => u.Accounts)
            .Where(u => u.TelegramUserId == msg.From.Username)
            .FirstOrDefaultAsync(cancellationToken: ct);
    }

    private static bool IsStartCommand(string text)
        => text.Equals("/start", StringComparison.OrdinalIgnoreCase);

    private static TransactionCategory? ResolveCategory(IEnumerable<TransactionCategory> categories,
        string categoryName)
    {
        var normalized = categoryName.Trim();
        var expenseCategories = categories.ToList();

        var exactMatch = expenseCategories
            .FirstOrDefault(c => string.Equals(c.Name, normalized, StringComparison.OrdinalIgnoreCase));
        if (exactMatch is not null)
            return exactMatch;

        var prefixMatches = expenseCategories
            .Where(c => c.Name.StartsWith(normalized, StringComparison.OrdinalIgnoreCase))
            .ToList();

        return prefixMatches.Count == 1
            ? prefixMatches[0]
            : expenseCategories.FirstOrDefault(c => c.IsDefault);
    }

    private static bool TryParseExpense(string text, out decimal amount, out string category, out string? note)
    {
        amount = 0;
        category = "";
        note = null;

        var parts = text.Split(',', 3, StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2 || !TryParseAmount(parts[0], out amount) || amount <= 0)
            return false;

        category = parts[1];
        note = parts.Length == 3 ? parts[2] : null;
        return !string.IsNullOrWhiteSpace(category);
    }

    private static bool TryParseAmount(string raw, out decimal amount)
    {
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

    private static string FormatAmount(decimal amount, Account account) => $"{amount:0.##} {account.Currency.Symbol}";

    [GeneratedRegex("^(?<value>[0-9]+(?:[.,][0-9]+)?)", RegexOptions.Compiled)]
    private static partial Regex AmountRegexCompiled();
}