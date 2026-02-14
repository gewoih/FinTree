namespace FinTree.Application.Telegram;

public enum TelegramTextFormat
{
    Plain = 0,
    Markdown = 1,
    Html = 2
}

public readonly record struct TelegramResponse(
    string Message,
    TelegramTextFormat Format = TelegramTextFormat.Plain);
