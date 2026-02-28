import { computed, type Ref } from 'vue'
import type { AnalyticsDashboardDto, EvolutionMonthDto } from '@/types'

export type GlobalMonthScoreAccent = 'excellent' | 'good' | 'average' | 'poor' | 'critical' | 'neutral'
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
      if (score < 20) {
        accent = 'critical'
      } else if (score < 40) {
        accent = 'poor'
      } else if (score < 60) {
        accent = 'average'
      } else if (score < 80) {
        accent = 'good'
      } else {
        accent = 'excellent'
      }
    }

    let statusLabel = 'Недостаточно данных'
    let statusDescription = 'Добавьте больше операций за месяц, чтобы оценка стала точнее.'

    if (accent === 'critical') {
      statusLabel = 'Критическая ситуация'
      statusDescription = 'Ваши финансы в критическом состоянии. Требуются срочные меры.'
    } else if (accent === 'poor') {
      statusLabel = 'Нужна коррекция'
      statusDescription = 'Нестабильная финансовая ситуация. Необходим серьезный контроль.'
    } else if (accent === 'average') {
      statusLabel = 'Зона внимания'
      statusDescription = 'Ситуация под контролем, продолжайте оптимизировать метрики.'
    } else if (accent === 'good') {
      statusLabel = 'Все в порядке'
      statusDescription = 'Ваши финансы стабильны. Продолжайте в том же направлении.'
    } else if (accent === 'excellent') {
      statusLabel = 'Отличный результат'
      statusDescription = 'Ваши финансы в отличном состоянии. Поддерживайте текущий темп.'
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
