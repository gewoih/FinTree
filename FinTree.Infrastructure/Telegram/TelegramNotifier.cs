using FinTree.Application.Exceptions;
using FinTree.Application.Telegram;
using Telegram.Bot;

namespace FinTree.Infrastructure.Telegram;

public sealed class TelegramNotifier(TelegramBotClient botClient) : ITelegramNotifier
{
    public async Task SendAsync(long telegramUserId, string text, TelegramTextFormat format, CancellationToken ct)
    {
        // Для личного чата с ботом chat id совпадает с Telegram user id.
        await botClient.SendMessage(telegramUserId, text, parseMode: TelegramParseModes.From(format), cancellationToken: ct);
    }
}

/// <summary>Регистрируется, когда <c>Telegram:BotToken</c> не задан.</summary>
public sealed class UnavailableTelegramNotifier : ITelegramNotifier
{
    public Task SendAsync(long telegramUserId, string text, TelegramTextFormat format, CancellationToken ct) =>
        throw new ConflictException("Telegram-бот не настроен.", "telegram_unavailable");
}
