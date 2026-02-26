import type { ComputedRef, Ref } from 'vue'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

export function useAnalyticsFormatting(baseCurrency: MaybeRef<string>) {
  const formatPercent = (value: number | null, fractionDigits = 0): string => {
    if (value == null || Number.isNaN(value)) return '—'
    return `${(value * 100).toFixed(fractionDigits)}%`
  }

  const formatPercentValue = (value: number | null, fractionDigits = 1): string => {
    if (value == null || Number.isNaN(value)) return '—'
    return `${value.toFixed(fractionDigits)}%`
  }

  const formatMoney = (value: number | null, maximumFractionDigits = 0): string => {
    if (value == null || Number.isNaN(value)) return '—'
    return value.toLocaleString('ru-RU', {
      style: 'currency',
      currency: baseCurrency.value,
      maximumFractionDigits
    })
  }

  const formatSignedMoney = (value: number | null): string => {
    if (value == null || Number.isNaN(value)) return '—'
    const sign = value < 0 ? '−' : '+'
    return `${sign} ${formatMoney(Math.abs(value))}`
  }

  const resolveSavingsStatus = (
    value: number | null,
    monthIncome: number | null,
    monthTotal: number | null
  ): 'good' | 'average' | 'poor' | 'neutral' => {
    if (value == null || Number.isNaN(value)) {
      if ((monthIncome ?? 0) <= 0 && (monthTotal ?? 0) > 0) return 'poor'
      return 'neutral'
    }
    if (value >= 0.2) return 'good'
    if (value >= 0.1) return 'average'
    return 'poor'
  }

  const resolveDiscretionaryStatus = (value: number | null): 'good' | 'average' | 'poor' | 'neutral' => {
    if (value == null || Number.isNaN(value)) return 'neutral'
    if (value <= 25) return 'good'
    if (value <= 45) return 'average'
    return 'poor'
  }

  const resolveCushionStatus = (status: string | null): 'good' | 'average' | 'poor' | 'neutral' => {
    if (!status) return 'neutral'
    if (status === 'good') return 'good'
    if (status === 'average') return 'average'
    if (status === 'poor') return 'poor'
    return 'neutral'
  }

  const normalizeMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  const addLocalMonths = (date: Date, months: number): Date => {
    return new Date(date.getFullYear(), date.getMonth() + months, 1)
  }

  const getMonthRangeLocal = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    return { from: start, to: end }
  }

  const formatMonthTitle = (date: Date): string => {
    const label = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date)
    const cleaned = label.replace(/\s*г\.$/i, '')
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  const formatDateQuery = (date: Date): string => {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatMonthLabel = (year: number, month: number): string => {
    const formatter = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric' })
    return formatter.format(new Date(year, month - 1, 1))
  }

  const hexToRgb = (hex: string): string => {
    const clean = hex.replace('#', '')
    if (clean.length !== 6) return '107,130,219'
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return `${r},${g},${b}`
  }

  const getIsoWeekRange = (year: number, week: number) => {
    const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
    const dayOfWeek = simple.getUTCDay()
    const isoWeekStart = new Date(simple)
    const diff = dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek
    isoWeekStart.setUTCDate(simple.getUTCDate() + diff)
    const isoWeekEnd = new Date(isoWeekStart)
    isoWeekEnd.setUTCDate(isoWeekStart.getUTCDate() + 6)
    return {
      start: new Date(isoWeekStart.getUTCFullYear(), isoWeekStart.getUTCMonth(), isoWeekStart.getUTCDate()),
      end: new Date(isoWeekEnd.getUTCFullYear(), isoWeekEnd.getUTCMonth(), isoWeekEnd.getUTCDate())
    }
  }

  return {
    formatPercent,
    formatPercentValue,
    formatMoney,
    formatSignedMoney,
    resolveSavingsStatus,
    resolveDiscretionaryStatus,
    resolveCushionStatus,
    normalizeMonth,
    addLocalMonths,
    getMonthRangeLocal,
    formatMonthTitle,
    formatDateQuery,
    formatMonthLabel,
    hexToRgb,
    getIsoWeekRange
  }
}
