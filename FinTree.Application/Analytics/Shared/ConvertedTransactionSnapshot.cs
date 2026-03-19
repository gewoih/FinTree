using FinTree.Domain.Transactions;

namespace FinTree.Application.Analytics.Shared;

/// <summary>
/// Снэпшот транзакции с суммой, уже переведённой в базовую валюту пользователя.
/// Конвертация выполняется один раз в <see cref="Services.DashboardService"/> —
/// под-сервисы работают только с готовыми суммами и не обращаются к курсам валют.
/// </summary>
public sealed record ConvertedTransactionSnapshot(
    DateTime OccurredAtUtc,
    TransactionType Type,
    decimal AmountInBaseCurrency,
    Guid? CategoryId,
    bool IsMandatory);
