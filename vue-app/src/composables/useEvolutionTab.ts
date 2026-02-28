import { computed, ref } from 'vue'
import { apiService } from '@/services/api.service'
import { useUserStore } from '@/stores/user'
import type { ViewState } from '@/types/view-state'
import type { EvolutionMonthDto } from '@/types'
import { resolveLatestDeltaPoint } from '@/composables/evolutionDeltaPoint'
import {
  resolveStabilityActionText,
  resolveStabilityStatusLabel,
} from '@/constants/stabilityInsight'
import {
  EVOLUTION_KPI_META,
  EVOLUTION_KPI_ORDER,
  extractKpiValue,
  formatKpiDelta,
  formatKpiValue,
  formatMonthLong,
  formatMonthShort,
  resolveDeltaTone,
  resolveTrendVerdict,
  toMonthKey,
  toPreviousCalendarMonth,
  type EvolutionKpi,
  type EvolutionRange,
  type EvolutionTableRowModel,
} from '@/composables/evolutionTabMeta'

export {
  EVOLUTION_KPI_META,
  EVOLUTION_KPI_ORDER,
  type EvolutionKpi,
  type EvolutionRange,
  type EvolutionDeltaTone,
  type EvolutionValueKind,
  type EvolutionKpiCardModel,
  type EvolutionTableCellModel,
  type EvolutionTableRowModel,
  type EvolutionTrendVerdict,
} from '@/composables/evolutionTabMeta'

export function useEvolutionTab() {
  const userStore = useUserStore()

  const data = ref<EvolutionMonthDto[]>([])
  const state = ref<ViewState>('idle')
  const error = ref<string | null>(null)

  const selectedRange = ref<EvolutionRange>(6)

  const baseCurrencyCode = computed(() => userStore.baseCurrencyCode ?? 'RUB')

  async function load() {
    if (state.value === 'loading') return

    state.value = 'loading'
    error.value = null

    try {
      data.value = await apiService.getEvolution(selectedRange.value)
      state.value = data.value.length > 0 ? 'success' : 'empty'
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Ошибка загрузки данных'
      state.value = 'error'
    }
  }

  async function changeRange(range: EvolutionRange) {
    selectedRange.value = range
    await load()
  }

  const monthMap = computed(() => {
    const map = new Map<string, EvolutionMonthDto>()

    for (const month of data.value) {
      map.set(toMonthKey(month.year, month.month), month)
    }

    return map
  })

  function resolveLatestPoint(kpi: EvolutionKpi) {
    const point = resolveLatestDeltaPoint(data.value, month => extractKpiValue(month, kpi))
    if (!point) return null

    return {
      month: point.currentMonth,
      value: point.currentValue,
      delta: point.delta,
    }
  }

  function resolveMonthDelta(month: EvolutionMonthDto, kpi: EvolutionKpi): number | null {
    const value = extractKpiValue(month, kpi)
    if (value == null) return null

    const prevMonth = toPreviousCalendarMonth(month.year, month.month)
    const previous = monthMap.value.get(toMonthKey(prevMonth.year, prevMonth.month))
    const previousValue = extractKpiValue(previous, kpi)

    if (previousValue == null) return null
    return value - previousValue
  }

  function resolveChartSeries(kpi: EvolutionKpi): { labels: string[]; values: number[] } {
    const labels: string[] = []
    const values: number[] = []

    for (const month of data.value) {
      const value = extractKpiValue(month, kpi)
      if (value == null) continue

      labels.push(formatMonthShort(month.year, month.month))
      values.push(value)
    }

    return { labels, values }
  }

  function buildCardModel(kpi: EvolutionKpi) {
    const meta = EVOLUTION_KPI_META[kpi]
    const series = resolveChartSeries(kpi)
    const hasSeriesData = series.values.length > 0
    const latestPoint = resolveLatestPoint(kpi)
    const deltaTone = resolveDeltaTone(meta, latestPoint?.delta ?? null)
    const isStabilityScore = kpi === 'stabilityScore'
    const statusLabel = isStabilityScore && latestPoint
      ? resolveStabilityStatusLabel(latestPoint.month.stabilityStatus)
      : null
    const actionLabel = isStabilityScore && latestPoint
      ? resolveStabilityActionText(latestPoint.month.stabilityActionCode)
      : null
    const trendVerdict = kpi === 'totalMonthScore'
      ? resolveTrendVerdict(series.values)
      : null

    return {
      key: kpi,
      label: meta.label,
      description: meta.description,
      directionHint: meta.directionHint,
      labels: series.labels,
      values: series.values,
      hasSeriesData,
      currentMonthLabel: latestPoint
        ? formatMonthLong(latestPoint.month.year, latestPoint.month.month)
        : null,
      currentValueLabel: latestPoint
        ? formatKpiValue(meta, latestPoint.value, baseCurrencyCode.value)
        : null,
      deltaLabel: formatKpiDelta(meta, latestPoint?.delta ?? null, baseCurrencyCode.value),
      deltaTone,
      statusLabel,
      actionLabel,
      trendVerdict,
    }
  }

  const heroCard = computed(() => buildCardModel('totalMonthScore'))

  const kpiCards = computed(() =>
    EVOLUTION_KPI_ORDER
      .filter(kpi => kpi !== 'totalMonthScore')
      .map(buildCardModel)
  )

  const tableRows = computed<EvolutionTableRowModel[]>(() => {
    const rows: EvolutionTableRowModel[] = []

    for (let index = data.value.length - 1; index >= 0; index -= 1) {
      const month = data.value.at(index)
      if (!month) continue

      if (!month.hasData) continue

      const cells = EVOLUTION_KPI_ORDER.map(kpi => {
        const meta = EVOLUTION_KPI_META[kpi]
        const value = extractKpiValue(month, kpi)
        const delta = resolveMonthDelta(month, kpi)
        const deltaTone = resolveDeltaTone(meta, delta)

        return {
          key: kpi,
          valueLabel: formatKpiValue(meta, value, baseCurrencyCode.value),
          deltaLabel: formatKpiDelta(meta, delta, baseCurrencyCode.value),
          deltaTone,
        }
      })

      rows.push({
        key: toMonthKey(month.year, month.month),
        monthLabel: formatMonthLong(month.year, month.month),
        cells,
      })
    }

    return rows
  })

  const hasTableRows = computed(() => tableRows.value.length > 0)

  return {
    state,
    error,
    selectedRange,
    baseCurrencyCode,
    heroCard,
    kpiCards,
    tableRows,
    hasTableRows,
    load,
    changeRange,
  }
}
