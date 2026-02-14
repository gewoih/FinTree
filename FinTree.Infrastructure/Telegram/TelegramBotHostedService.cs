using System.Globalization;
using FinTree.Application.Telegram;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;

namespace FinTree.Infrastructure.Telegram;

public sealed class TelegramBotHostedService(
    TelegramBotClient botClient,
    IServiceProvider serviceProvider,
    ILogger<TelegramBotHostedService> logger)
    : BackgroundService
{
    private readonly ReceiverOptions _receiverOptions = new()
    {
        AllowedUpdates = [UpdateType.Message]
    };

    private readonly BotCommand[] _availableCommands =
    [
        new() { Command = "expense", Description = "Формат добавления расхода" },
        new() { Command = "income", Description = "Формат добавления дохода" },
        new() { Command = "transfer", Description = "Формат перевода" },
        new() { Command = "accounts", Description = "Показать счета и алиасы" },
        new() { Command = "format", Description = "Полная шпаргалка форматов" },
        new() { Command = "id", Description = "Показать Telegram ID" }
    ];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        botClient.StartReceiving(HandleUpdateAsync, HandleErrorAsync, _receiverOptions, stoppingToken);
        await RegisterCommandsAsync(stoppingToken);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private Task HandleErrorAsync(ITelegramBotClient _, Exception ex, CancellationToken __)
    {
        logger.LogError(ex, "Ошибка Telegram API");
        return Task.CompletedTask;
    }

    private async Task HandleUpdateAsync(ITelegramBotClient _, Update update, CancellationToken ct)
    {
        try
        {
            if (update.Message is { Type: MessageType.Text } message)
                await OnMessageAsync(message, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "HandleUpdate failed");
        }
    }

    private async Task OnMessageAsync(Message message, CancellationToken ct)
    {
        var chatId = message.Chat.Id;
        var text = (message.Text ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(text))
            return;

        await using var scope = serviceProvider.CreateAsyncScope();
        var operations = scope.ServiceProvider.GetRequiredService<TelegramOperationsService>();

        if (TryGetCommand(text, out var command))
        {
            if (command.Equals("id", StringComparison.OrdinalIgnoreCase))
            {
                var idValue = message.From?.Id.ToString(CultureInfo.InvariantCulture) ?? "не удалось определить";
                await botClient.SendMessage(chatId, $"Ваш Telegram ID: {idValue}", cancellationToken: ct);
                return;
            }

            var commandResponse = await ResolveCommandResponseAsync(command, message.From?.Id, operations, ct);
            await SendResponseAsync(chatId, commandResponse, ct);
            return;
        }

        if (message.From is null)
            return;

        var response = await operations.ProcessOperationsAsync(message.From.Id, text, ct);
        await SendResponseAsync(chatId, response, ct);
    }

    private async Task<TelegramResponse> ResolveCommandResponseAsync(
        string command,
        long? telegramUserId,
        TelegramOperationsService operations,
        CancellationToken ct)
    {
        switch (command)
        {
            case "start":
            case "help":
            case "menu":
                return operations.GetStartResponse();

            case "format":
                return operations.GetFormatResponse();

            case "expense":
                return operations.GetExpenseFormatResponse();

            case "income":
                return operations.GetIncomeFormatResponse();

            case "transfer":
                return operations.GetTransferFormatResponse();

            case "accounts":
                if (!telegramUserId.HasValue)
                    return operations.BuildUserNotFoundResponse();

                return await operations.BuildAccountsResponseAsync(telegramUserId.Value, ct);

            default:
                return operations.GetUnknownCommandResponse();
        }
    }

    private async Task SendResponseAsync(long chatId, TelegramResponse response, CancellationToken ct)
    {
        var parseMode = response.Format switch
        {
            TelegramTextFormat.Markdown => ParseMode.Markdown,
            TelegramTextFormat.Html => ParseMode.Html,
            TelegramTextFormat.Plain => ParseMode.None,
            _ => throw new ArgumentOutOfRangeException()
        };

        await botClient.SendMessage(chatId, response.Message, parseMode: parseMode, cancellationToken: ct);
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

    private static bool TryGetCommand(string text, out string command)
    {
        command = string.Empty;

        if (string.IsNullOrWhiteSpace(text) || !text.StartsWith('/'))
            return false;

        var raw = text.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw))
            return false;

        var withoutSlash = raw[1..];
        var atIndex = withoutSlash.IndexOf('@');
        if (atIndex >= 0)
            withoutSlash = withoutSlash[..atIndex];

        command = withoutSlash.Trim().ToLowerInvariant();
        return !string.IsNullOrWhiteSpace(command);
    }
}
