namespace FinTree.Application.Telegram;

public sealed record NotifySelfRequest(string Text, TelegramTextFormat Format = TelegramTextFormat.Plain);
