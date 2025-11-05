using System.Globalization;
using FinTree.Domain.Accounts;
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
using Telegram.Bot.Types.ReplyMarkups;

namespace FinTree.Infrastructure.Telegram;

public class TelegramBotHostedService(
    TelegramBotClient botClient,
    IServiceProvider serviceProvider,
    ILogger<TelegramBotHostedService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var receiverOptions = new ReceiverOptions
        {
            AllowedUpdates = [UpdateType.Message, UpdateType.CallbackQuery]
        };

        botClient.StartReceiving(HandleUpdateAsync, HandleErrorAsync, receiverOptions, stoppingToken);

        var commands = new[]
        {
            new BotCommand { Command = "expense", Description = "Добавить расход" }
        };

        try
        {
            await botClient.SetMyCommands(commands, cancellationToken: stoppingToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Не удалось установить команды бота");
        }

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private Task HandleErrorAsync(ITelegramBotClient arg1, Exception arg2, CancellationToken arg3)
    {
        throw new NotImplementedException();
    }

    private async Task HandleUpdateAsync(ITelegramBotClient bot, Update update, CancellationToken ct)
    {
        try
        {
            switch (update.Type)
            {
                case UpdateType.Message when update.Message!.Type == MessageType.Text:
                    await OnMessage(update.Message!, ct);
                    break;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "HandleUpdate failed");
        }
    }
    
    private async Task OnMessage(Message msg, CancellationToken ct)
    {
        var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        
        var chatId = msg.Chat.Id;
        var text = (msg.Text ?? string.Empty).Trim();

        if (text.Equals("/start", StringComparison.OrdinalIgnoreCase))
        {
            await botClient.SendMessage(chatId,
                "Пришли сообщение в формате:\n`{сумма} {категория} {заметка?}`\nНапример: `2400 продукты`",
                parseMode: ParseMode.Markdown,
                cancellationToken: ct);
            return;
        }

        // Пытаемся распарсить как "сумма категория заметка?"
        if (!TryParseExpense(text, out var amount, out var categoryName, out var note))
        {
            await botClient.SendMessage(chatId,
                "Не понял формат. Пришли: `2400 продукты` или `1300 продукты на неделю`.",
                parseMode: ParseMode.Markdown,
                cancellationToken: ct);
            return;
        }

        // Резолвим пользователя домена
        var user = await context.Users
            .Include(u => u.Accounts)
            .Where(u => u.TelegramUserId == msg.From.Username)
            .FirstOrDefaultAsync(cancellationToken: ct);
        
        if (user is null)
        {
            await botClient.SendMessage(chatId,
                "Не удалось сопоставить ваш Telegram с пользователем. Пройдите линк-авторизацию и попробуйте снова.",
                cancellationToken: ct);
            return;
        }

        // Основной счёт
        var account = user.Accounts.FirstOrDefault(a => a.IsMain);
        if (account is null)
        {
            await botClient.SendMessage(chatId,
                "Основной счёт не найден. Создайте/назначьте основной счёт и повторите.",
                cancellationToken: ct);
            return;
        }

        // Категория
        var category = await context.TransactionCategories
            .Where(t => t.UserId == user.Id || !t.UserId.HasValue)
            .Where(t => t.Name.ToLower() == categoryName.ToLower())
            .FirstOrDefaultAsync(cancellationToken: ct);

        if (category is not null)
        {
            try
            {
                account.AddTransaction(TransactionType.Expense, category.Id, amount, DateTime.UtcNow, note);
                await context.SaveChangesAsync(ct);
                
                await botClient.SendMessage(chatId,
                    $"✅ Добавил расход:\n" +
                    $"💳 Счёт: {account.Name} ({account.Currency.Code})\n" +
                    $"📂 Категория: {category.Name}\n" +
                    $"💰 Сумма: {FormatAmount(amount, account)}\n" +
                    (string.IsNullOrWhiteSpace(note) ? "" : $"📝 Заметка: {note}\n"),
                    ParseMode.Html,
                    cancellationToken: ct);
            }
            catch (Exception)
            {
                await botClient.SendMessage(chatId, "❌ Ошибка при сохранении. Попробуйте позже.", cancellationToken: ct);
            }
            
            return;
        }

        var shortNote = (note ?? "").Trim();
        if (shortNote.Length > 28) shortNote = shortNote[..28]; // чтобы callback влез
        var data = BuildCallbackData(amount, shortNote); // expyes:{amount}:{note}

        var preview =
            "Категория не найдена.\n" +
            $"Создать расход <b>без категории</b>?\n\n" +
            $"💳 Счёт: {account.Name} ({account.Currency.Code})\n" +
            $"📂 Категория: <i>—</i>\n" +
            $"💰 Сумма: {FormatAmount(amount, account)}\n" +
            (string.IsNullOrEmpty(shortNote) ? "" : $"📝 Заметка: {shortNote}\n");

        var kb = new InlineKeyboardMarkup(new[]
        {
            new []
            {
                InlineKeyboardButton.WithCallbackData("✅ Да", data),
                InlineKeyboardButton.WithCallbackData("❌ Нет", "expno")
            }
        });

        await botClient.SendMessage(chatId, preview, ParseMode.Html, replyMarkup: kb, cancellationToken: ct);
    }
    
    private static bool TryParseExpense(string text, out decimal amount, out string category, out string? note)
    {
        amount = 0; category = ""; note = null;

        // Нормализуем точки/запятые для суммы
        var parts = text.Split(' ', 3, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2) return false;

        // Разбираем число с инвариантной культурой и с запятой
        var sumRaw = parts[0].Replace(',', '.');
        if (!decimal.TryParse(sumRaw, NumberStyles.Number, CultureInfo.InvariantCulture, out amount))
            return false;

        if (amount <= 0) return false;

        category = parts[1].Trim();
        note = parts.Length == 3 ? parts[2].Trim() : null;
        return !string.IsNullOrWhiteSpace(category);
    }

    private static string FormatAmount(decimal amount, Account account)
        => $"{amount:0.##} {account.Currency.Symbol}";

    private static string BuildCallbackData(decimal amount, string note)
    {
        var amt = amount.ToString("0.##", CultureInfo.InvariantCulture);
        note = note.Replace(":", " ");
        var data = $"expyes:{amt}:{note}";
        return data.Length <= 64 ? data : $"expyes:{amt}:"; // на всякий случай
    }
}