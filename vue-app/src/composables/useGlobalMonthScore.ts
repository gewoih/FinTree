import { computed, type Ref } from 'vue'
import type { AnalyticsDashboardDto, EvolutionMonthDto } from '@/types'

export type GlobalMonthScoreAccent = 'good' | 'average' | 'poor' | 'neutral'
export type GlobalMonthScoreDeltaTone = 'better' | 'worse' | 'neutral' | null

export interface GlobalMonthScoreModel {
  score: number | null
  scoreLabel: string
  statusLabel: string
  statusDescription: string
  accent: GlobalMonthScoreAccent
  deltaLabel: string | null
  deltaTone: GlobalMonthScoreDeltaTone
}

interface UseGlobalMonthScoreContext {
  dashboard: Ref<AnalyticsDashboardDto | null>
  evolutionMonths: Ref<EvolutionMonthDto[]>
  selectedMonth: Ref<Date>
}

export function useGlobalMonthScore(context: UseGlobalMonthScoreContext) {
  const {
    dashboard,
    evolutionMonths,
    selectedMonth,
  } = context

  const evolutionScoreByMonth = computed(() => {
    const monthMap = new Map<string, number | null>()

    for (const month of evolutionMonths.value) {
      const key = `${month.year}-${String(month.month).padStart(2, '0')}`
      monthMap.set(key, month.totalMonthScore ?? null)
    }

    return monthMap
  })

  const globalMonthScore = computed<GlobalMonthScoreModel>(() => {
    const health = dashboard.value?.health
    const score = health?.totalMonthScore ?? null
    const scoreLabel = score == null ? '—' : `${score}/100`

    let accent: GlobalMonthScoreAccent = 'neutral'
    if (score != null) {
      if (score < 40) {
        accent = 'poor'
      } else if (score < 75) {
        accent = 'average'
      } else {
        accent = 'good'
      }
    }

    let statusLabel = 'Недостаточно данных'
    let statusDescription = 'Добавьте больше операций за месяц, чтобы оценка стала точнее.'

    if (score != null) {
      if (score < 40) {
        statusLabel = 'Нужна коррекция'
        statusDescription = 'Тренд месяца нестабилен. Начните с метрик, которые просели сильнее всего.'
      } else if (score < 75) {
        statusLabel = 'Зона внимания'
        statusDescription = 'Ситуация под контролем, но есть точки для улучшения в отдельных метриках.'
      } else {
        statusLabel = 'Все в порядке'
        statusDescription = 'Базовые финансовые привычки устойчивы. Поддерживайте текущий темп.'
      }
    }

    const selectedMonthKey = `${selectedMonth.value.getFullYear()}-${String(selectedMonth.value.getMonth() + 1).padStart(2, '0')}`
    const previousMonthDate = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth() - 1, 1)
    const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`

    const currentScore = evolutionScoreByMonth.value.get(selectedMonthKey) ?? score
    const previousScore = evolutionScoreByMonth.value.get(previousMonthKey) ?? null
    const delta = currentScore != null && previousScore != null
      ? currentScore - previousScore
      : null

    let deltaLabel: string | null = null
    let deltaTone: GlobalMonthScoreDeltaTone = null

    if (delta != null) {
      const prefix = delta > 0 ? '+' : delta < 0 ? '-' : ''
      deltaLabel = `${prefix}${Math.abs(delta)} п. к пред. месяцу`

      if (delta > 0) {
        deltaTone = 'better'
      } else if (delta < 0) {
        deltaTone = 'worse'
      } else {
        deltaTone = 'neutral'
      }
    }

    return {
      score,
      scoreLabel,
      statusLabel,
      statusDescription,
      accent,
      deltaLabel,
      deltaTone,
    }
  })

  return {
    globalMonthScore,
  }
}
