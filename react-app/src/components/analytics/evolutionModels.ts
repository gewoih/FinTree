import type { EvolutionMonthDto, StabilityActionCode, StabilityStatusCode } from '@/types';

export type EvolutionKpi =
  | 'totalMonthScore'
  | 'savingsRate'
  | 'stabilityScore'
  | 'discretionaryPercent'
  | 'liquidMonths'
  | 'peakDayRatio';

export type EvolutionRange = 6 | 12 | 0;
export type EvolutionDirection = 'higher-better' | 'lower-better';
export type EvolutionValueKind = 'ratio' | 'percent' | 'months' | 'score';
export type EvolutionDeltaTone = 'better' | 'worse' | 'neutral';
export type EvolutionTrendVerdict = 'growing' | 'declining' | 'stable';

export interface EvolutionKpiMeta {
  key: EvolutionKpi;
  label: string;
  description: string;
  directionHint: string;
  direction: EvolutionDirection;
  valueKind: EvolutionValueKind;
  precision: number;
}

export interface EvolutionKpiCardModel {
  key: EvolutionKpi;
  label: string;
  description: string;
  directionHint: string;
  values: Array<number | null>;
  labels: string[];
  hasSeriesData: boolean;
  currentMonthLabel: string | null;
  currentValueLabel: string | null;
  deltaLabel: string | null;
  deltaTone: EvolutionDeltaTone | null;
  statusLabel: string | null;
  actionLabel: string | null;
  trendVerdict: EvolutionTrendVerdict | null;
}

export interface EvolutionTableCellModel {
  key: EvolutionKpi;
  valueLabel: string;
  deltaLabel: string | null;
  deltaTone: EvolutionDeltaTone | null;
}

export interface EvolutionTableRowModel {
  key: string;
  monthLabel: string;
  cells: EvolutionTableCellModel[];
}

export const EVOLUTION_KPI_ORDER: EvolutionKpi[] = [
  'totalMonthScore',
  'savingsRate',
  'stabilityScore',
  'discretionaryPercent',
  'liquidMonths',
  'peakDayRatio',
];

export const EVOLUTION_KPI_META: Record<EvolutionKpi, EvolutionKpiMeta> = {
  totalMonthScore: {
    key: 'totalMonthScore',
    label: 'Общий рейтинг месяца',
    description: 'Итоговый взвешенный балл за месяц по ключевым финансовым метрикам.',
    directionHint: 'Цель: выше',
    direction: 'higher-better',
    valueKind: 'score',
    precision: 0,
  },
  savingsRate: {
    key: 'savingsRate',
    label: 'Норма сбережений',
    description: 'Сколько дохода остаётся после всех расходов.',
    directionHint: 'Цель: выше',
    direction: 'higher-better',
    valueKind: 'ratio',
    precision: 1,
  },
  discretionaryPercent: {
    key: 'discretionaryPercent',
    label: 'Необязательные расходы',
    description: 'Доля необязательных трат в общих расходах.',
    directionHint: 'Цель: ниже',
    direction: 'lower-better',
    valueKind: 'percent',
    precision: 1,
  },
  stabilityScore: {
    key: 'stabilityScore',
    label: 'Стабильность трат',
    description: 'Показывает, насколько ровно распределены траты по месяцу.',
    directionHint: 'Цель: выше',
    direction: 'higher-better',
    valueKind: 'score',
    precision: 0,
  },
  peakDayRatio: {
    key: 'peakDayRatio',
    label: 'Доля пиковых дней',
    description: 'Процент дней с аномально высокими расходами.',
    directionHint: 'Цель: ниже',
    direction: 'lower-better',
    valueKind: 'percent',
    precision: 1,
  },
  liquidMonths: {
    key: 'liquidMonths',
    label: 'Финансовая подушка',
    description: 'На сколько месяцев хватит ликвидных средств.',
    directionHint: 'Цель: выше',
    direction: 'higher-better',
    valueKind: 'months',
    precision: 1,
  },
};

const monthShortFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'short',
  year: '2-digit',
});

const monthLongFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
});

const STABILITY_ACTION_LABELS: Record<StabilityActionCode, string> = {
  keep_routine: 'Расходы стабильны. Продолжайте сохранять текущий ритм.',
  smooth_spikes: 'Редкие всплески расходов. Старайтесь контролировать ваши траты.',
  cap_impulse_spend: 'Расходы хаотичны. Уделите внимание импульсивным тратам.',
};

const STABILITY_STATUS_LABELS: Record<StabilityStatusCode, string> = {
  good: 'Ровная динамика',
  average: 'Есть всплески',
  poor: 'Траты скачут',
};

export function formatEvolutionMonthShort(year: number, month: number): string {
  return monthShortFormatter.format(new Date(year, month - 1, 1)).replace(/\s*г\.$/i, '').trim();
}

export function formatEvolutionMonthLong(year: number, month: number): string {
  const raw = monthLongFormatter.format(new Date(year, month - 1, 1)).replace(/\s*г\.$/i, '').trim();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function toPreviousCalendarMonth(year: number, month: number): { year: number; month: number } {
  if (month > 1) {
    return { year, month: month - 1 };
  }

  return { year: year - 1, month: 12 };
}

function extractKpiValue(month: EvolutionMonthDto | null | undefined, key: EvolutionKpi): number | null {
  if (!month || !month.hasData) {
    return null;
  }

  const value = month[key];
  return value === null || value === undefined ? null : Number(value);
}

function formatNumber(value: number, fractionDigits: number): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatKpiValue(meta: EvolutionKpiMeta, value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  switch (meta.valueKind) {
    case 'ratio':
      return `${formatNumber(value * 100, meta.precision)}%`;
    case 'percent':
      return `${formatNumber(value, meta.precision)}%`;
    case 'months':
      return `${formatNumber(value, meta.precision)} мес.`;
    case 'score':
      return `${formatNumber(value, meta.precision)}/100`;
    default:
      return '—';
  }
}

function formatKpiDelta(meta: EvolutionKpiMeta, delta: number | null): string | null {
  if (delta === null || Number.isNaN(delta)) {
    return null;
  }

  const sign = delta < 0 ? '−' : '+';
  const absolute = Math.abs(delta);

  switch (meta.valueKind) {
    case 'ratio':
    case 'percent':
      return `${sign}${formatNumber(meta.valueKind === 'ratio' ? absolute * 100 : absolute, meta.precision)} п.п.`;
    case 'months':
      return `${sign}${formatNumber(absolute, meta.precision)} мес.`;
    case 'score':
      return `${sign}${formatNumber(absolute, meta.precision)} п.`;
    default:
      return null;
  }
}

function resolveDeltaTone(meta: EvolutionKpiMeta, delta: number | null): EvolutionDeltaTone | null {
  if (delta === null || Number.isNaN(delta)) {
    return null;
  }

  if (delta === 0) {
    return 'neutral';
  }

  if (meta.direction === 'higher-better') {
    return delta > 0 ? 'better' : 'worse';
  }

  return delta < 0 ? 'better' : 'worse';
}

function resolveTrendVerdict(values: Array<number | null>): EvolutionTrendVerdict | null {
  const numericValues = values.filter((value): value is number => value !== null);
  if (numericValues.length < 2) {
    return null;
  }

  const last = numericValues.at(-1) ?? 0;
  const anchor = numericValues.length >= 3 ? (numericValues.at(-3) ?? numericValues[0] ?? 0) : (numericValues[0] ?? 0);
  const slope = last - anchor;

  if (slope > 5) {
    return 'growing';
  }

  if (slope < -5) {
    return 'declining';
  }

  return 'stable';
}

function resolveLatestDeltaPoint(
  months: readonly EvolutionMonthDto[],
  readValue: (month: EvolutionMonthDto) => number | null,
) {
  let current: { month: EvolutionMonthDto; value: number } | null = null;
  let previous: { month: EvolutionMonthDto; value: number } | null = null;

  for (let index = months.length - 1; index >= 0; index -= 1) {
    const month = months.at(index);
    if (!month) {
      continue;
    }

    const value = readValue(month);
    if (value === null || Number.isNaN(value)) {
      continue;
    }

    if (!current) {
      current = { month, value };
      continue;
    }

    previous = { month, value };
    break;
  }

  if (!current) {
    return null;
  }

  return {
    currentMonth: current.month,
    currentValue: current.value,
    delta: previous ? current.value - previous.value : null,
  };
}

function resolveMonthDelta(
  month: EvolutionMonthDto,
  kpi: EvolutionKpi,
  monthMap: Map<string, EvolutionMonthDto>,
): number | null {
  const value = extractKpiValue(month, kpi);
  if (value === null) {
    return null;
  }

  const previousMonth = toPreviousCalendarMonth(month.year, month.month);
  const previous = monthMap.get(toMonthKey(previousMonth.year, previousMonth.month));
  const previousValue = extractKpiValue(previous, kpi);

  if (previousValue === null) {
    return null;
  }

  return value - previousValue;
}

function buildChartSeries(months: EvolutionMonthDto[], kpi: EvolutionKpi) {
  const labels: string[] = [];
  const values: Array<number | null> = [];

  for (const month of months) {
    const value = extractKpiValue(month, kpi);
    if (value === null) {
      continue;
    }

    labels.push(formatEvolutionMonthShort(month.year, month.month));
    values.push(value);
  }

  return { labels, values };
}

function buildCardModel(months: EvolutionMonthDto[], kpi: EvolutionKpi): EvolutionKpiCardModel {
  const meta = EVOLUTION_KPI_META[kpi];
  const series = buildChartSeries(months, kpi);
  const latestPoint = resolveLatestDeltaPoint(months, (month) => extractKpiValue(month, kpi));

  return {
    key: kpi,
    label: meta.label,
    description: meta.description,
    directionHint: meta.directionHint,
    labels: series.labels,
    values: series.values,
    hasSeriesData: series.values.length > 0,
    currentMonthLabel: latestPoint
      ? formatEvolutionMonthLong(latestPoint.currentMonth.year, latestPoint.currentMonth.month)
      : null,
    currentValueLabel: formatKpiValue(meta, latestPoint?.currentValue ?? null),
    deltaLabel: formatKpiDelta(meta, latestPoint?.delta ?? null),
    deltaTone: resolveDeltaTone(meta, latestPoint?.delta ?? null),
    statusLabel:
      kpi === 'stabilityScore' && latestPoint?.currentMonth.stabilityStatus
        ? STABILITY_STATUS_LABELS[latestPoint.currentMonth.stabilityStatus]
        : null,
    actionLabel:
      kpi === 'stabilityScore' && latestPoint?.currentMonth.stabilityActionCode
        ? STABILITY_ACTION_LABELS[latestPoint.currentMonth.stabilityActionCode]
        : null,
    trendVerdict: kpi === 'totalMonthScore' ? resolveTrendVerdict(series.values) : null,
  };
}

export function buildEvolutionViewModel(months: EvolutionMonthDto[]) {
  const monthMap = new Map<string, EvolutionMonthDto>();
  for (const month of months) {
    monthMap.set(toMonthKey(month.year, month.month), month);
  }

  const heroCard = buildCardModel(months, 'totalMonthScore');
  const kpiCards = EVOLUTION_KPI_ORDER.filter((kpi) => kpi !== 'totalMonthScore').map((kpi) =>
    buildCardModel(months, kpi),
  );

  const tableRows: EvolutionTableRowModel[] = [];
  for (let index = months.length - 1; index >= 0; index -= 1) {
    const month = months.at(index);
    if (!month || !month.hasData) {
      continue;
    }

    tableRows.push({
      key: toMonthKey(month.year, month.month),
      monthLabel: formatEvolutionMonthLong(month.year, month.month),
      cells: EVOLUTION_KPI_ORDER.map((kpi) => {
        const meta = EVOLUTION_KPI_META[kpi];
        const value = extractKpiValue(month, kpi);
        const delta = resolveMonthDelta(month, kpi, monthMap);

        return {
          key: kpi,
          valueLabel: formatKpiValue(meta, value),
          deltaLabel: formatKpiDelta(meta, delta),
          deltaTone: resolveDeltaTone(meta, delta),
        };
      }),
    });
  }

  return {
    heroCard,
    kpiCards,
    tableRows,
    hasTableRows: tableRows.length > 0,
  };
}
