namespace FinTree.Application.Analytics.Services.Metrics;

// Статус карточки здоровья. Считается на бэкенде из порогов HealthThresholds,
// чтобы цвет карточки всегда соответствовал баллам оценки месяца.
public static class HealthStatus
{
    public const string Good = "good";
    public const string Average = "average";
    public const string Poor = "poor";

    // Метрика «больше — лучше» (сбережения, подушка, стабильность).
    public static string HigherIsBetter(decimal value, decimal goodAt, decimal averageAt)
        => value >= goodAt ? Good
            : value >= averageAt ? Average
            : Poor;

    // Метрика «меньше — лучше» (доля необязательных расходов).
    public static string LowerIsBetter(decimal value, decimal goodAt, decimal averageAt)
        => value <= goodAt ? Good
            : value <= averageAt ? Average
            : Poor;
}
