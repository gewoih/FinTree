import type {
  GoalSimulationParametersDto,
  GoalSimulationRequestDto,
  GoalSimulationResultDto,
} from '@/types';
import { formatCurrency, formatNumber } from '@/utils/format';
import type {
  GoalChartPoint,
  GoalDataQualityModel,
  GoalParameterOverrides,
} from './goalModels';

function roundNullable(value: number | null | undefined, digits = 6): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function monthOrderValue(monthsFromNow: number): number {
  return monthsFromNow < 0 ? Number.POSITIVE_INFINITY : monthsFromNow;
}

export function buildGoalRequest(
  targetAmount: number | null,
  overrides: GoalParameterOverrides
): GoalSimulationRequestDto {
  return {
    targetAmount: Math.max(0, Math.round(targetAmount ?? 0)),
    initialCapital: roundNullable(overrides.initialCapital, 2),
    monthlyIncome: roundNullable(overrides.monthlyIncome, 2),
    monthlyExpenses: roundNullable(overrides.monthlyExpenses, 2),
    annualReturnRate: roundNullable(overrides.annualReturnRate, 6),
  };
}

export function getGoalRequestKey(
  targetAmount: number | null,
  overrides: GoalParameterOverrides
): string {
  return JSON.stringify(buildGoalRequest(targetAmount, overrides));
}

export function areGoalOverridesEqual(
  left: GoalParameterOverrides,
  right: GoalParameterOverrides
): boolean {
  return (
    (left.initialCapital ?? null) === (right.initialCapital ?? null) &&
    (left.monthlyIncome ?? null) === (right.monthlyIncome ?? null) &&
    (left.monthlyExpenses ?? null) === (right.monthlyExpenses ?? null) &&
    (left.annualReturnRate ?? null) === (right.annualReturnRate ?? null)
  );
}

export function buildGoalChartPoints(
  result: GoalSimulationResultDto | null,
  targetAmount: number
): GoalChartPoint[] {
  if (!result || result.monthLabels.length === 0) {
    return [];
  }

  return result.monthLabels.map((label, index) => ({
    label: index === 0 ? 'сейчас' : label.slice(0, 3),
    tooltipLabel: label,
    p25: result.percentilePaths.p25[index] ?? 0,
    p50: result.percentilePaths.p50[index] ?? 0,
    p75: result.percentilePaths.p75[index] ?? 0,
    target: targetAmount,
  }));
}

export function formatGoalDate(
  monthsFromNow: number,
  monthLabels?: string[]
): string {
  if (monthsFromNow < 0) {
    return '—';
  }

  if (monthsFromNow === 0) {
    return 'сейчас';
  }

  const monthLabel = monthLabels?.[monthsFromNow];
  if (monthLabel) {
    return monthLabel;
  }

  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);

  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

export function buildGoalAchievementRangeText(
  result: GoalSimulationResultDto | null
): string {
  if (!result) {
    return '—';
  }

  const firstMonth = result.p25Months;
  const secondMonth = result.p75Months;
  const earlierMonth =
    monthOrderValue(firstMonth) <= monthOrderValue(secondMonth)
      ? firstMonth
      : secondMonth;
  const laterMonth = earlierMonth === firstMonth ? secondMonth : firstMonth;

  return `${formatGoalDate(earlierMonth, result.monthLabels)} — ${formatGoalDate(
    laterMonth,
    result.monthLabels
  )}`;
}

export function buildGoalDataQuality(
  score: number | null | undefined
): GoalDataQualityModel | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return null;
  }

  if (score >= 0.95) {
    return {
      tone: 'high',
      label: 'Высокое качество данных',
      description: 'Истории операций достаточно для более стабильной симуляции.',
      scorePercent: Math.round(score * 100),
    };
  }

  if (score >= 0.85) {
    return {
      tone: 'medium',
      label: 'Среднее качество данных',
      description: 'Прогноз может заметно меняться по мере накопления новой истории.',
      scorePercent: Math.round(score * 100),
    };
  }

  return {
    tone: 'low',
    label: 'Низкое качество данных',
    description: 'Истории пока мало, результат симуляции ориентировочный.',
    scorePercent: Math.round(score * 100),
  };
}

export function formatGoalTargetAmount(value: number, currencyCode: string): string {
  return formatCurrency(value, currencyCode);
}

export function formatGoalProbability(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatGoalPercentDisplay(value: number | null): string {
  if (value == null) {
    return '';
  }

  return formatNumber(value * 100, 1);
}

export function resolveGoalParamValue(
  resolvedParams: GoalSimulationParametersDto,
  field: keyof GoalParameterOverrides
): number {
  switch (field) {
    case 'initialCapital':
      return resolvedParams.initialCapital;
    case 'monthlyIncome':
      return resolvedParams.monthlyIncome;
    case 'monthlyExpenses':
      return resolvedParams.monthlyExpenses;
    case 'annualReturnRate':
      return resolvedParams.annualReturnRate;
  }
}
