using FinTree.Application.Telegram;
using Telegram.Bot.Types.Enums;

namespace FinTree.Infrastructure.Telegram;

internal static class TelegramParseModes
{
    public static ParseMode From(TelegramTextFormat format) => format switch
    {
        TelegramTextFormat.Markdown => ParseMode.Markdown,
        TelegramTextFormat.Html => ParseMode.Html,
        TelegramTextFormat.Plain => ParseMode.None,
        _ => throw new ArgumentOutOfRangeException(nameof(format), format, null)
    };
}
