namespace FinTree.Application.Analytics.Dto;

// Пороги-ориентиры для карточек здоровья. Фронтенд строит из них подписи «цель/норма»,
// не храня собственных копий порогов. Значения берутся из HealthThresholds.
public readonly record struct HealthBenchmarksDto(
    decimal SavingsRateTargetPercent,
    decimal DiscretionaryShareTargetPercent,
    decimal LiquidityMonthsTarget);
