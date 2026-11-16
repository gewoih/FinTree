namespace FinTree.Application.Telegram;

public interface ITelegramNotifier
{
    Task SendAsync(long telegramUserId, string text, TelegramTextFormat format, CancellationToken ct);
}
