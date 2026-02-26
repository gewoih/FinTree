import type { EvolutionMonthDto } from '@/types'

export type EvolutionKpi =
  | 'savingsRate'
  | 'stabilityScore'
  | 'discretionaryPercent'
  | 'netWorth'
  | 'liquidMonths'
  | 'meanDaily'
  | 'peakDayRatio'

export type EvolutionRange = 6 | 12 | 0
export type EvolutionKpiGroupId = 'balance' | 'stability' | 'capital'
export type EvolutionDirection = 'higher-better' | 'lower-better'
export type EvolutionValueKind = 'ratio' | 'percent' | 'currency' | 'months' | 'score'
export type EvolutionDeltaTone = 'better' | 'worse' | 'neutral'

export interface EvolutionKpiMeta {
  key: EvolutionKpi
  label: string
  groupId: EvolutionKpiGroupId
  description: string
  directionHint: string
  direction: EvolutionDirection
  valueKind: EvolutionValueKind
  precision: number
}

export interface EvolutionKpiCardModel {
  key: EvolutionKpi
  label: string
  description: string
  directionHint: string
  values: Array<number | null>
  labels: string[]
  hasSeriesData: boolean
  currentMonthLabel: string | null
  currentValueLabel: string | null
  deltaLabel: string | null
  deltaTone: EvolutionDeltaTone | null
  statusLabel: string | null
  actionLabel: string | null
}

export interface EvolutionKpiGroupModel {
  id: EvolutionKpiGroupId
  label: string
  cards: EvolutionKpiCardModel[]
}

export interface EvolutionTableCellModel {
  key: EvolutionKpi
  valueLabel: string
  deltaLabel: string | null
  deltaTone: EvolutionDeltaTone | null
}

export interface EvolutionTableRowModel {
  key: string
  monthLabel: string
  cells: EvolutionTableCellModel[]
}

export const EVOLUTION_STORAGE_PREFIX = 'ft:evolution:visible-kpis:'

export const EVOLUTION_KPI_ORDER: EvolutionKpi[] = [
  'savingsRate',
  'stabilityScore',
  'discretionaryPercent',
  'netWorth',
  'liquidMonths',
  'meanDaily',
  'peakDayRatio',
]

export const EVOLUTION_GROUPS: Array<{ id: EvolutionKpiGroupId; label: string }> = [
  { id: 'balance', label: 'Баланс доходов и расходов' },
  { id: 'stability', label: 'Стабильность трат' },
  { id: 'capital', label: 'Капитал и подушка' },
]

export const EVOLUTION_KPI_META: Record<EvolutionKpi, EvolutionKpiMeta> = {
  savingsRate: {
    key: 'savingsRate',
    label: 'Норма сбережений',
    groupId: 'balance',
    description: 'Сколько дохода остаётся после всех расходов.',
    directionHint: 'Цель: выше',
    direction: 'higher-better',
    valueKind: 'ratio',
    precision: 1,
  },
  discretionaryPercent: {
    key: 'discretionaryPercent',
    label: 'Необязательные расходы',
    groupId: 'balance',
    description: 'Доля необязательных трат в общих расходах.',
    directionHint: 'Цель: ниже',
    direction: 'lower-better',
    valueKind: 'percent',
    precision: 1,
  },
  meanDaily: {
    key: 'meanDaily',
    label: 'Средние расходы в день',
    groupId: 'balance',
    description: 'Средний размер дневных расходов за месяц.',
    directionHint: 'Цель: ниже',
    direction: 'lower-better',
    valueKind: 'currency',
    precision: 0,
  },
  stabilityScore: {
    key: 'stabilityScore',
    label: 'Стабильность трат',
    groupId: 'stability',
    description: 'Показывает, насколько ровно распределены траты по месяцу.',
    directionHint: 'Цель: выше',
    direction: 'higher-better',
    valueKind: 'score',
    precision: 0,
  },
  peakDayRatio: {
    key: 'peakDayRatio',
    label: 'Доля пиковых дней',
    groupId: 'stability',
    description: 'Процент дней с аномально высокими расходами.',
    directionHint: 'Цель: ниже',
    direction: 'lower-better',
    valueKind: 'percent',
    precision: 1,
  },
  netWorth: {
    key: 'netWorth',
    label: 'Чистый капитал',
    groupId: 'capital',
    description: 'Сумма активов за вычетом обязательств.',
    directionHint: 'Цель: выше',
    direction: 'higher-better',
    valueKind: 'currency',
    precision: 0,
  },
  liquidMonths: {
    key: 'liquidMonths',
    label: 'Финансовая подушка',
    groupId: 'capital',
    description: 'На сколько месяцев хватит ликвидных средств.',
    directionHint: 'Цель: выше',
    direction: 'higher-better',
    valueKind: 'months',
    precision: 1,
  },
}

const monthShortFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'short',
  year: '2-digit',
})

const monthLongFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
})

export function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function toPreviousCalendarMonth(year: number, month: number): { year: number; month: number } {
  if (month > 1) {
    return { year, month: month - 1 }
  }

  return { year: year - 1, month: 12 }
}

export function formatMonthShort(year: number, month: number): string {
  return monthShortFormatter.format(new Date(year, month - 1, 1)).replace(/\s*г\.$/i, '').trim()
}

export function formatMonthLong(year: number, month: number): string {
  const raw = monthLongFormatter.format(new Date(year, month - 1, 1)).replace(/\s*г\.$/i, '').trim()
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function extractKpiValue(month: EvolutionMonthDto | null | undefined, key: EvolutionKpi): number | null {
  if (!month || !month.hasData) return null
  const value = month[key]
  return value == null ? null : Number(value)
}

export function normalizeVisibleKpis(input: unknown): EvolutionKpi[] | null {
  if (!Array.isArray(input)) return null

  const seen = new Set<EvolutionKpi>()
  const normalized: EvolutionKpi[] = []

  for (const raw of input) {
    if (typeof raw !== 'string') continue
    const migratedKey = raw === 'stabilityIndex' ? 'stabilityScore' : raw
    if (!EVOLUTION_KPI_ORDER.includes(migratedKey as EvolutionKpi)) continue

    const key = migratedKey as EvolutionKpi
    if (seen.has(key)) continue

    seen.add(key)
    normalized.push(key)
  }

  if (input.length > 0 && normalized.length === 0) {
    return [...EVOLUTION_KPI_ORDER]
  }

  return normalized
}

function formatNumber(value: number, fractionDigits: number): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

function formatMoney(value: number, currencyCode: string, fractionDigits = 0): string {
  return value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

export function formatKpiValue(meta: EvolutionKpiMeta, value: number | null, currencyCode: string): string {
  if (value == null || Number.isNaN(value)) return '—'

  switch (meta.valueKind) {
    case 'ratio':
      return `${formatNumber(value * 100, meta.precision)}%`
    case 'percent':
      return `${formatNumber(value, meta.precision)}%`
    case 'currency':
      return formatMoney(value, currencyCode, meta.precision)
    case 'months':
      return `${formatNumber(value, meta.precision)} мес.`
    case 'score':
      return `${formatNumber(value, meta.precision)}/100`
    default:
      return '—'
  }
}

export function formatKpiDelta(meta: EvolutionKpiMeta, delta: number | null, currencyCode: string): string | null {
  if (delta == null || Number.isNaN(delta)) return null

  const sign = delta < 0 ? '−' : '+'
  const absolute = Math.abs(delta)

  switch (meta.valueKind) {
    case 'ratio':
      return `${sign}${formatNumber(absolute * 100, meta.precision)} п.п.`
    case 'percent':
      return `${sign}${formatNumber(absolute, meta.precision)} п.п.`
    case 'currency':
      return `${sign}${formatMoney(absolute, currencyCode, meta.precision)}`
    case 'months':
      return `${sign}${formatNumber(absolute, meta.precision)} мес.`
    case 'score':
      return `${sign}${formatNumber(absolute, meta.precision)} п.`
    default:
      return null
  }
}

export function resolveDeltaTone(meta: EvolutionKpiMeta, delta: number | null): EvolutionDeltaTone | null {
  if (delta == null || Number.isNaN(delta)) return null
  if (delta === 0) return 'neutral'

  if (meta.direction === 'higher-better') {
    return delta > 0 ? 'better' : 'worse'
  }

  return delta < 0 ? 'better' : 'worse'
}
