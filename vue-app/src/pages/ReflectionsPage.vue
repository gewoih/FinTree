<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { ChartData, TooltipItem } from 'chart.js'
import Chart from 'primevue/chart'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RetrospectiveMonthModal from '@/components/reflections/RetrospectiveMonthModal.vue'
import { useChartColors } from '@/composables/useChartColors'
import { useReflections } from '@/composables/useReflections'
import type { RetrospectiveListItemDto } from '@/types'

type ChartRange = 6 | 12 | 0

type ScoreMetric = 'disciplineRating' | 'impulseControlRating' | 'confidenceRating'

type MonthOption = {
  label: string
  value: string
  hasRetrospective: boolean
}

const RANGE_OPTIONS: Array<{ label: string; value: ChartRange }> = [
  { label: '6 мес', value: 6 },
  { label: '12 мес', value: 12 },
  { label: 'Всё', value: 0 },
]

const METRIC_OPTIONS: Array<{ key: ScoreMetric; label: string }> = [
  { key: 'disciplineRating', label: 'Дисциплина' },
  { key: 'impulseControlRating', label: 'Контроль импульсов' },
  { key: 'confidenceRating', label: 'Финансовая уверенность' },
]

const router = useRouter()
const { colors, tooltipConfig } = useChartColors()
const {
  list,
  listState,
  listError,
  availableMonths,
  availableMonthsState,
  availableMonthsError,
  loadList,
  loadAvailableMonths,
} = useReflections()

const selectedRange = ref<ChartRange>(12)
const isCreateDialogVisible = ref(false)
const selectedCreateMonth = ref<string | null>(null)
const createError = ref<string | null>(null)

const hasItems = computed(() => list.value.length > 0)

const sortedHistory = computed(() => {
  return [...list.value].sort((a, b) => a.month.localeCompare(b.month))
})

const historyForChart = computed(() => {
  if (selectedRange.value === 0) {
    return sortedHistory.value
  }

  return sortedHistory.value.slice(-selectedRange.value)
})

const chartData = computed<ChartData<'bar', Array<number | null>, string> | null>(() => {
  if (historyForChart.value.length === 0) {
    return null
  }

  const labels = historyForChart.value.map(item => formatMonthCompact(item.month))
  const datasets = METRIC_OPTIONS.map((metric, index) => ({
    label: metric.label,
    data: historyForChart.value.map(item => item[metric.key]),
    backgroundColor: colors.palette[index] ?? colors.primary,
    borderRadius: 8,
    barPercentage: 0.82,
    categoryPercentage: 0.72,
    stack: 'scores',
    maxBarThickness: 42,
  }))

  return {
    labels,
    datasets,
  }
})

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  scales: {
    x: {
      stacked: true,
      grid: {
        display: false,
      },
      ticks: {
        color: colors.text,
        font: { size: 12 },
      },
    },
    y: {
      stacked: true,
      min: 0,
      max: 15,
      ticks: {
        stepSize: 5,
        color: colors.text,
        font: { size: 12 },
      },
      grid: {
        color: colors.grid,
      },
    },
  },
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      ...tooltipConfig(),
      callbacks: {
        label(context: TooltipItem<'bar'>) {
          if (context.parsed.y == null) {
            return `${context.dataset.label}: нет оценки`
          }

          return `${context.dataset.label}: ${context.parsed.y}/5`
        },
        footer(context: TooltipItem<'bar'>[]) {
          const values = context
            .map(item => item.parsed.y)
            .filter((value): value is number => typeof value === 'number')

          if (values.length === 0) {
            return 'Итог: нет оценок'
          }

          const total = values.reduce((sum, value) => sum + value, 0)
          const maxScore = METRIC_OPTIONS.length * 5
          const percent = Math.round((total / maxScore) * 100)

          return `Итог: ${total}/${maxScore} (${percent}%)`
        },
      },
    },
  },
}))

const retrospectiveMonths = computed(() => new Set(list.value.map(item => item.month)))

const availableMonthOptions = computed<MonthOption[]>(() => {
  return availableMonths.value.map(month => ({
    label: formatMonth(month),
    value: month,
    hasRetrospective: retrospectiveMonths.value.has(month),
  }))
})

const openCreateModal = () => {
  isCreateDialogVisible.value = true
}

const continueCreate = () => {
  if (!selectedCreateMonth.value) {
    createError.value = 'Выберите месяц для рефлексии.'
    return
  }

  void router.push(`/reflections/${selectedCreateMonth.value}`)
  isCreateDialogVisible.value = false
  selectedCreateMonth.value = null
  createError.value = null
}

const openDetail = (month: string) => {
  router.push(`/reflections/${month}`)
}

const getCardPreview = (item: RetrospectiveListItemDto): string | null => {
  return item.winsPreview ?? item.conclusionPreview ?? null
}

const getScoreTone = (percent: number | null): string => {
  if (percent == null) return ''
  if (percent >= 70) return 'reflections-page__card-score--good'
  if (percent >= 40) return 'reflections-page__card-score--average'
  return 'reflections-page__card-score--poor'
}

const setRange = (range: ChartRange) => {
  selectedRange.value = range
}

const formatMonth = (month: string) => {
  const [yearRaw, monthRaw] = month.split('-')
  const year = Number(yearRaw)
  const monthValue = Number(monthRaw)

  if (!Number.isFinite(year) || !Number.isFinite(monthValue)) {
    return month
  }

  const date = new Date(year, monthValue - 1, 1)
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

const formatMonthCompact = (month: string) => {
  const [yearRaw, monthRaw] = month.split('-')
  const year = Number(yearRaw)
  const monthValue = Number(monthRaw)

  if (!Number.isFinite(year) || !Number.isFinite(monthValue)) {
    return month
  }

  const date = new Date(year, monthValue - 1, 1)
  return date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })
}

const formatScore = (value: number | null) => {
  return value == null ? '—' : `${value}/5`
}

const formatRating = (value: number | null) => {
  return value == null ? '—' : String(value)
}

const getScoreValues = (item: RetrospectiveListItemDto): number[] => {
  return [
    item.disciplineRating,
    item.impulseControlRating,
    item.confidenceRating,
  ].filter((value): value is number => value != null)
}

const getScorePercent = (item: RetrospectiveListItemDto): number | null => {
  const scores = getScoreValues(item)

  if (scores.length === 0) {
    return null
  }

  const total = scores.reduce((sum, score) => sum + score, 0)
  const max = scores.length * 5
  return Math.round((total / max) * 100)
}

const formatScorePercent = (value: number | null) => {
  return value == null ? '—' : `${value}%`
}

onMounted(() => {
  void loadList()
})

watch(isCreateDialogVisible, visible => {
  if (!visible) {
    selectedCreateMonth.value = null
    createError.value = null
    return
  }

  void loadAvailableMonths(true)
})

watch(selectedCreateMonth, value => {
  if (value) {
    createError.value = null
  }
})
</script>

<template>
  <PageContainer class="reflections-page">
    <PageHeader title="Рефлексии">
      <template #actions>
        <button
          type="button"
          class="reflections-page__add-btn"
          @click="openCreateModal"
        >
          + Добавить
        </button>
      </template>
    </PageHeader>

    <section class="reflections-page__content">
      <div
        v-if="listState === 'loading'"
        class="reflections-page__skeleton"
      >
        <Skeleton
          v-for="index in 4"
          :key="index"
          height="120px"
        />
      </div>

      <div
        v-else-if="listState === 'error'"
        class="reflections-page__error"
      >
        <Message severity="error">
          {{ listError || 'Не удалось загрузить рефлексии.' }}
        </Message>
        <button
          type="button"
          class="reflections-page__retry-btn"
          @click="loadList"
        >
          Повторить
        </button>
      </div>

      <div
        v-else-if="!hasItems"
        class="reflections-page__empty"
      >
        <h2 class="reflections-page__empty-title">
          Пока нет рефлексий
        </h2>
        <p class="reflections-page__empty-description">
          Подведите итоги любого прошедшего месяца, чтобы отслеживать свой прогресс.
        </p>
      </div>

      <template v-else>
        <section class="reflections-page__chart-card">
          <div class="reflections-page__chart-header">
            <h2 class="reflections-page__chart-title">История самооценки</h2>
          </div>

          <div class="reflections-page__range" role="group" aria-label="Период">
            <button
              v-for="range in RANGE_OPTIONS"
              :key="range.value"
              type="button"
              class="reflections-page__chip"
              :class="{ 'reflections-page__chip--active': selectedRange === range.value }"
              @click="setRange(range.value)"
            >
              {{ range.label }}
            </button>
          </div>

          <div class="reflections-page__chart-wrap" role="img" aria-label="График истории самооценки">
            <Chart
              v-if="chartData"
              type="bar"
              :data="chartData"
              :options="chartOptions"
            />
          </div>

          <div class="reflections-page__chart-legend">
            <span
              v-for="(metric, index) in METRIC_OPTIONS"
              :key="metric.key"
              class="reflections-page__legend-item"
            >
              <span
                class="reflections-page__legend-dot"
                :style="{ background: colors.palette[index] ?? colors.primary }"
              />
              {{ metric.label }}
            </span>
          </div>
        </section>

        <div class="reflections-page__list">
          <button
            v-for="item in list"
            :key="item.month"
            type="button"
            class="reflections-page__card"
            @click="openDetail(item.month)"
          >
            <div class="reflections-page__card-top">
              <span class="reflections-page__card-month">{{ formatMonth(item.month) }}</span>
              <span
                class="reflections-page__card-score"
                :class="getScoreTone(getScorePercent(item))"
              >
                {{ formatScorePercent(getScorePercent(item)) }}
              </span>
            </div>

            <p class="reflections-page__card-ratings">
              {{ formatRating(item.disciplineRating) }} · {{ formatRating(item.impulseControlRating) }} · {{ formatRating(item.confidenceRating) }}<span class="reflections-page__card-ratings-max"> /5</span>
            </p>

            <p
              v-if="getCardPreview(item)"
              class="reflections-page__card-preview"
            >
              {{ getCardPreview(item) }}
            </p>
          </button>
        </div>
      </template>
    </section>

    <RetrospectiveMonthModal
      v-model:visible="isCreateDialogVisible"
      v-model:selected-month="selectedCreateMonth"
      :loading="availableMonthsState === 'loading'"
      :options="availableMonthOptions"
      :fetch-error="availableMonthsState === 'error' ? (availableMonthsError || 'Не удалось загрузить доступные месяцы.') : null"
      :submit-error="createError"
      @confirm="continueCreate"
    />
  </PageContainer>
</template>

<style scoped src="@/styles/pages/reflections-page.css"></style>
