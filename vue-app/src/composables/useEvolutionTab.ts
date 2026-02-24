import { ref, computed } from 'vue'
import { apiService } from '@/services/api.service'
import type { EvolutionMonthDto } from '@/types'
import type { ViewState } from '@/types/view-state'

export type EvolutionKpi =
  | 'savingsRate'
  | 'stabilityIndex'
  | 'discretionaryPercent'
  | 'netWorth'
  | 'liquidMonths'
  | 'meanDaily'
  | 'peakDayRatio'

export type EvolutionRange = 6 | 12 | 0

export const KPI_OPTIONS: { key: EvolutionKpi; label: string }[] = [
  { key: 'savingsRate', label: 'Норма сбережений' },
  { key: 'stabilityIndex', label: 'Индекс стабильности' },
  { key: 'discretionaryPercent', label: 'Необязательные расходы' },
  { key: 'netWorth', label: 'Чистый капитал' },
  { key: 'liquidMonths', label: 'Финансовая подушка' },
  { key: 'meanDaily', label: 'Средние расходы в день' },
  { key: 'peakDayRatio', label: 'Доля пиковых дней' },
]

export function useEvolutionTab() {
  const data = ref<EvolutionMonthDto[]>([])
  const state = ref<ViewState>('idle')
  const error = ref<string | null>(null)

  const selectedKpi = ref<EvolutionKpi>('savingsRate')
  const selectedRange = ref<EvolutionRange>(12)

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

  const chartLabels = computed(() =>
    data.value.map(m => {
      const d = new Date(m.year, m.month - 1, 1)
      return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })
    })
  )

  const chartValues = computed(() =>
    data.value.map(m => (m.hasData ? (m[selectedKpi.value] ?? null) : null))
  )

  const currentMonthValue = computed(() => {
    const last = [...data.value].reverse().find(m => m.hasData)
    return last ? last[selectedKpi.value] : null
  })

  const previousMonthValue = computed(() => {
    const months = data.value.filter(m => m.hasData)
    const previous = months.at(-2)
    return previous ? previous[selectedKpi.value] : null
  })

  const monthOverMonthDelta = computed(() => {
    const cur = currentMonthValue.value
    const prev = previousMonthValue.value
    if (cur == null || prev == null || prev === 0) return null
    return cur - prev
  })

  return {
    data,
    state,
    error,
    selectedKpi,
    selectedRange,
    chartLabels,
    chartValues,
    currentMonthValue,
    monthOverMonthDelta,
    load,
    changeRange,
  }
}
