namespace FinTree.Application.Analytics.Shared;

/// <summary>
/// Предзагруженный и конвертированный срез данных для аналитики дашборда.
/// Создаётся один раз в <see cref="Services.DashboardService"/>: транзакции загружаются из БД,
/// конвертируются в базовую валюту и передаются во все под-сервисы.
/// Под-сервисы фильтруют нужный диапазон и тип в памяти — без обращений к БД или курсам валют.
/// </summary>
public sealed record AnalyticsDataset(
    IReadOnlyList<ConvertedTransactionSnapshot> Transactions);
