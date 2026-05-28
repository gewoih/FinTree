namespace FinTree.Application.Analytics.Services.Metrics;

// Единый источник порогов финансовых метрик. И расчёт баллов оценки месяца,
// и статусы карточек («good/average/poor»), и подписи-ориентиры на фронтенде
// (через HealthBenchmarksDto) используют ТОЛЬКО эти значения — расхождение исключено.
public static class HealthThresholds
{
    // «Идеальное» значение метрики: компонент даёт 100 баллов, статус карточки — «good».
    public const decimal SavingsRateTargetPercent = 30m;
    public const decimal DiscretionaryShareTargetPercent = 20m;
    public const decimal LiquidityMonthsTarget = 6m;

    // Нижняя граница статуса «average»: ниже неё метрика получает статус «poor».
    public const decimal SavingsRateAveragePercent = 15m;
    public const decimal DiscretionaryShareAveragePercent = 50m;
    public const decimal LiquidityMonthsAverage = 3m;
}
