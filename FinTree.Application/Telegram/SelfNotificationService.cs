using FinTree.Application.Abstractions;
using FinTree.Application.Exceptions;
using FinTree.Application.Users;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Telegram;

/// <summary>Отправка сообщения текущему пользователю в его привязанный Telegram.</summary>
public sealed class SelfNotificationService(
    IAppDbContext context,
    ICurrentUser currentUser,
    ITelegramNotifier notifier)
{
    public const int MaxMessageLength = 4096;

    public async Task NotifyCurrentUserAsync(string text, TelegramTextFormat format, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new DomainValidationException("Текст сообщения пуст.", "notify_text_empty");
        if (text.Length > MaxMessageLength)
            throw new DomainValidationException(
                $"Текст сообщения длиннее {MaxMessageLength} символов.", "notify_text_too_long");

        var telegramUserId = await context.Users
            .Where(u => u.Id == currentUser.Id)
            .Select(u => u.TelegramUserId)
            .SingleOrDefaultAsync(ct);

        if (telegramUserId is null)
            throw new ConflictException("Telegram не привязан к аккаунту.", "telegram_not_linked");

        await notifier.SendAsync(telegramUserId.Value, text, format, ct);
    }
}
