import type {
  AnalyticsReadinessDto,
  FinancialHealthSummaryDto,
  StabilityActionCode,
  StabilityStatusCode,
} from '@/types';
import { formatNumber } from '@/utils/format';

/** Shared analytics surface token. */
export const ANALYTICS_CARD_BG = 'var(--ft-analytics-surface)';

export type MetricAccent =
  | 'income'
  | 'expense'
  | 'good'
  | 'poor'
  | 'warning'
  | 'neutral';

export interface SummaryMetric {
  key: string;
  label: string;
  value: string;
  icon: string;
  accent: MetricAccent;
  tooltip: string;
  secondary?: string;
}

export type GlobalScoreAccent =
  | 'excellent'
  | 'good'
  | 'average'
  | 'poor'
  | 'critical'
  | 'neutral';

export type GlobalScoreDeltaTone = 'better' | 'worse' | 'neutral' | null;

export interface GlobalScoreModel {
  score: number | null;
  scoreLabel: string;
  description: string;
  accent: GlobalScoreAccent;
  deltaLabel: string | null;
  deltaTone: GlobalScoreDeltaTone;
}

export interface HealthMetricCardModel {
  key: 'savings' | 'cushion' | 'stability' | 'discretionary';
  title: string;
  icon: string;
  value: string;
  supportingValue?: string;
  supportingLabel: string;
  accent: MetricAccent;
  tooltip: string;
  progress?: number;
  benchmarkLabel?: string;
  isPreview?: boolean;
}

const STABILITY_ACTION_TEXTS: Record<StabilityActionCode, string> = {
  keep_routine: 'Расходы стабильны. Продолжайте сохранять текущий ритм.',
  smooth_spikes: 'Редкие всплески расходов. Старайтесь контролировать ваши траты.',
  cap_impulse_spend: 'Расходы хаотичны. Уделите особое внимание импульсивным тратам.',
};

function formatAnalyticsCurrency(
  value: number,
  currency: string,
  maximumFractionDigits = 0,
): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

export function formatAnalyticsHeroMoney(value: number | null, currency: string): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return formatAnalyticsCurrency(value, currency);
}

export function formatAnalyticsMetaMoney(value: number | null, currency: string): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return formatAnalyticsCurrency(value, currency);
}

export function formatAnalyticsPercent(value: number | null, fractionDigits = 1): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return `${formatNumber(value, fractionDigits)}%`;
}

export function formatAnalyticsMonths(value: number | null, fractionDigits = 1): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return `${formatNumber(value, fractionDigits)} мес.`;
}

export function formatAnalyticsScore(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return `${formatNumber(value, 0)}/100`;
}

export function formatAnalyticsMoneyRange(
  from: number | null,
  to: number | null,
  currency: string,
): string {
  if (from === null || to === null || Number.isNaN(from) || Number.isNaN(to)) {
    return '—';
  }

  return `${formatAnalyticsHeroMoney(from, currency)} — ${formatAnalyticsHeroMoney(to, currency)}`;
}

function formatSignedPercentValue(value: number | null): string | undefined {
  if (value === null || Number.isNaN(value)) {
    return undefined;
  }

  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatAnalyticsPercent(Math.abs(value))} к пред. месяцу`;
}

function formatSignedCurrency(value: number | null, currency: string): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  const sign = value < 0 ? '−' : '+';
  return `${sign} ${formatAnalyticsHeroMoney(Math.abs(value), currency)}`;
}

function formatRatioPercent(value: number | null, fractionDigits = 1): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return formatAnalyticsPercent(value * 100, fractionDigits);
}

function formatPercentValue(value: number | null, fractionDigits = 1): string {
  return formatAnalyticsPercent(value, fractionDigits);
}

function resolveSavingsAccent(
  savingsRate: number | null,
  monthIncome: number | null,
  monthTotal: number | null,
): MetricAccent {
  if (savingsRate === null || Number.isNaN(savingsRate)) {
    if ((monthIncome ?? 0) <= 0 && (monthTotal ?? 0) > 0) {
      return 'poor';
    }

    return 'neutral';
  }

  if (savingsRate >= 0.2) return 'good';
  if (savingsRate >= 0.1) return 'warning';
  return 'poor';
}

function resolveCushionAccent(status: FinancialHealthSummaryDto['liquidMonthsStatus']): MetricAccent {
  if (status === 'good') return 'good';
  if (status === 'average') return 'warning';
  if (status === 'poor') return 'poor';
  return 'neutral';
}

function resolveStabilityAccent(
  status: StabilityStatusCode | null,
  hasStabilityData: boolean,
): MetricAccent {
  if (!hasStabilityData) return 'neutral';
  if (status === 'good') return 'good';
  if (status === 'average') return 'warning';
  if (status === 'poor') return 'poor';
  return 'neutral';
}

function resolveDiscretionaryAccent(value: number | null): MetricAccent {
  if (value === null || Number.isNaN(value)) return 'neutral';
  if (value <= 25) return 'good';
  if (value <= 45) return 'warning';
  return 'poor';
}

function resolveScoreAccent(score: number | null): GlobalScoreAccent {
  if (score === null) return 'neutral';
  if (score < 20) return 'critical';
  if (score < 40) return 'poor';
  if (score < 60) return 'average';
  if (score < 80) return 'good';
  return 'excellent';
}

function resolveScoreDescription(accent: GlobalScoreAccent): string {
  switch (accent) {
    case 'critical':
      return 'Ваши финансы в критическом состоянии. Требуются срочные меры.';
    case 'poor':
      return 'Нестабильная финансовая ситуация. Необходим серьезный контроль.';
    case 'average':
      return 'Ситуация под контролем, продолжайте оптимизировать метрики.';
    case 'good':
      return 'Ваши финансы стабильны. Продолжайте в том же направлении.';
    case 'excellent':
      return 'Ваши финансы в отличном состоянии. Поддерживайте текущий темп.';
    default:
      return 'Добавьте больше операций за месяц, чтобы оценка стала точнее.';
  }
}

function resolveScoreDelta(delta: number | null): Pick<GlobalScoreModel, 'deltaLabel' | 'deltaTone'> {
  if (delta === null || Number.isNaN(delta)) {
    return {
      deltaLabel: null,
      deltaTone: null,
    };
  }

  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return {
    deltaLabel: `${sign}${formatNumber(Math.abs(delta), 1)} п. к пред. месяцу`,
    deltaTone: delta > 0 ? 'better' : delta < 0 ? 'worse' : 'neutral',
  };
}

export function buildSummaryMetrics(
  health: FinancialHealthSummaryDto,
  currency: string,
): SummaryMetric[] {
  const netCashflow = health.netCashflow ?? null;
  const balanceAccent: MetricAccent =
    netCashflow === null ? 'neutral' : netCashflow >= 0 ? 'good' : 'poor';

  return [
    {
      key: 'income',
      label: 'Доход',
      value: formatAnalyticsHeroMoney(health.monthIncome, currency),
      icon: 'Banknote',
      accent: 'income',
      tooltip: 'Все доходы за выбранный месяц.',
      secondary: formatSignedPercentValue(health.incomeMonthOverMonthChangePercent),
    },
    {
      key: 'expense',
      label: 'Расходы',
      value: formatAnalyticsHeroMoney(health.monthTotal, currency),
      icon: 'TrendingDown',
      accent: 'expense',
      tooltip: 'Все расходы за выбранный месяц.',
      secondary: formatSignedPercentValue(health.monthOverMonthChangePercent),
    },
    {
      key: 'balance',
      label: 'Баланс месяца',
      value: formatSignedCurrency(netCashflow, currency),
      icon: 'Wallet',
      accent: balanceAccent,
      tooltip: 'Доходы минус расходы.',
      secondary: formatSignedPercentValue(health.balanceMonthOverMonthChangePercent),
    },
  ];
}

export function buildGlobalScoreModel(health: FinancialHealthSummaryDto): GlobalScoreModel {
  const score = health.totalMonthScore;
  const accent = resolveScoreAccent(score);
  const scoreLabel = formatAnalyticsScore(score);

  return {
    score,
    scoreLabel,
    description: resolveScoreDescription(accent),
    accent,
    ...resolveScoreDelta(health.totalMonthScoreDeltaPoints),
  };
}

export function buildHealthMetricCards(
  health: FinancialHealthSummaryDto,
  readiness: AnalyticsReadinessDto,
  currency: string,
): HealthMetricCardModel[] {
  const stabilityReady = readiness.hasStabilityDataForSelectedMonth;
  const stabilityAdvice = stabilityReady
    ? health.stabilityActionCode
      ? STABILITY_ACTION_TEXTS[health.stabilityActionCode]
      : 'Добавляйте расходы регулярно, чтобы получить подсказку.'
    : `${readiness.observedStabilityDaysInSelectedMonth} из ${readiness.requiredStabilityDays} дней с расходами`;

  return [
    {
      key: 'savings',
      title: 'Сбережения',
      icon: 'Percent',
      value: formatRatioPercent(health.savingsRate),
      supportingValue: formatSignedCurrency(health.netCashflow, currency),
      supportingLabel: 'сохранено',
      accent: resolveSavingsAccent(health.savingsRate, health.monthIncome, health.monthTotal),
      tooltip: 'Ваша сэкономленная часть от доходов.',
      progress: health.savingsRate !== null && !Number.isNaN(health.savingsRate)
        ? Math.min(100, Math.max(0, health.savingsRate * 100))
        : undefined,
      benchmarkLabel: 'цель: ≥20%',
    },
    {
      key: 'cushion',
      title: 'Финансовая подушка',
      icon: 'Shield',
      value: formatAnalyticsMonths(health.liquidMonths),
      supportingValue:
        health.liquidAssets === null ? undefined : formatAnalyticsMetaMoney(health.liquidAssets, currency),
      supportingLabel: 'сумма подушки',
      accent: resolveCushionAccent(health.liquidMonthsStatus),
      tooltip: 'На сколько месяцев жизни хватит средств из подушки безопасности.',
      progress: health.liquidMonths !== null && !Number.isNaN(health.liquidMonths)
        ? Math.min(100, Math.max(0, (health.liquidMonths / 6) * 100))
        : undefined,
      benchmarkLabel: 'норма: 6+ мес',
    },
    {
      key: 'stability',
      title: 'Стабильность трат',
      icon: 'ChartNoAxesColumnIncreasing',
      value: formatAnalyticsScore(health.stabilityScore),
      supportingLabel: stabilityAdvice,
      accent: resolveStabilityAccent(health.stabilityStatus, stabilityReady),
      progress: health.stabilityScore !== null && !Number.isNaN(health.stabilityScore) && stabilityReady
        ? Math.min(100, Math.max(0, health.stabilityScore))
        : undefined,
      benchmarkLabel: 'хорошо: ≥80',
      tooltip: stabilityReady
        ? 'Показывает, насколько стабильны ваши расходы за месяц. Чем выше балл, тем лучше.'
        : `Нужны расходы хотя бы в ${readiness.requiredStabilityDays} днях этого месяца. Сейчас: ${readiness.observedStabilityDaysInSelectedMonth} из ${readiness.requiredStabilityDays}.`,
      isPreview: health.stabilityIsPreview,
    },
    {
      key: 'discretionary',
      title: 'Необязательные',
      icon: 'ShoppingBag',
      value: formatPercentValue(health.discretionarySharePercent),
      supportingValue:
        health.discretionaryTotal === null
          ? undefined
          : formatAnalyticsMetaMoney(health.discretionaryTotal, currency),
      supportingLabel: 'сумма',
      accent: resolveDiscretionaryAccent(health.discretionarySharePercent),
      tooltip: 'Ваши необязательные расходы.',
      progress: health.discretionarySharePercent !== null && !Number.isNaN(health.discretionarySharePercent)
        ? Math.min(100, Math.max(0, 100 - health.discretionarySharePercent))
        : undefined,
      benchmarkLabel: 'хорошо: ≤25%',
    },
  ];
}
