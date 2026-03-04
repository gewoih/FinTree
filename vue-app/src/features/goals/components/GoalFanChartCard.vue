<script setup lang="ts">
import { computed } from 'vue'
import type { ChartData, TooltipItem } from 'chart.js'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'
import { useChartColors } from '@/composables/useChartColors.ts'
import type { GoalSimulationResultDto } from '@/types.ts'

const props = defineProps<{
  loading: boolean
  result: GoalSimulationResultDto | null
  targetAmount: number
  currencyCode: string
}>()

const { colors, tooltipConfig } = useChartColors()

function colorWithAlpha(color: string, alpha: number): string {
  const normalized = color.trim()

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1)
    const validHex =
      hex.length === 3
        ? hex
            .split('')
            .map(char => `${char}${char}`)
            .join('')
        : hex

    if (validHex.length === 6) {
      const r = Number.parseInt(validHex.slice(0, 2), 16)
      const g = Number.parseInt(validHex.slice(2, 4), 16)
      const b = Number.parseInt(validHex.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
  }

  const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/i)
  if (rgbMatch) {
    const [r, g, b] = (rgbMatch[1] ?? '')
      .split(',')
      .slice(0, 3)
      .map(part => Number.parseFloat(part.trim()))

    if ([r, g, b].every(value => Number.isFinite(value)))
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return normalized
}

const chartData = computed((): ChartData<'line', number[], string> | null => {
  const simulationResult = props.result

  if (!simulationResult || !simulationResult.percentilePaths || simulationResult.monthLabels.length === 0)
    return null

  const percentilePaths = simulationResult.percentilePaths
  const labels = simulationResult.monthLabels
  const base = colors.primary

  return {
    labels,
    datasets: [
      {
        label: 'P10',
        data: percentilePaths.p10,
        borderColor: colorWithAlpha(base, 0.25),
        backgroundColor: colorWithAlpha(base, 0.12),
        borderWidth: 1,
        pointRadius: 0,
        fill: '+6',
        tension: 0.3,
      },
      {
        label: 'P20',
        data: percentilePaths.p20,
        borderColor: colorWithAlpha(base, 0.35),
        backgroundColor: colorWithAlpha(base, 0.18),
        borderWidth: 1,
        pointRadius: 0,
        fill: '+4',
        tension: 0.3,
      },
      {
        label: 'P40',
        data: percentilePaths.p40,
        borderColor: colorWithAlpha(base, 0.5),
        backgroundColor: colorWithAlpha(base, 0.28),
        borderWidth: 1,
        pointRadius: 0,
        fill: '+2',
        tension: 0.3,
      },
      {
        label: 'Медиана',
        data: percentilePaths.p50,
        borderColor: base,
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      },
      {
        label: 'P60',
        data: percentilePaths.p60,
        borderColor: colorWithAlpha(base, 0.3),
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      },
      {
        label: 'P80',
        data: percentilePaths.p80,
        borderColor: colorWithAlpha(base, 0.2),
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      },
      {
        label: 'P90',
        data: percentilePaths.p90,
        borderColor: colorWithAlpha(base, 0.15),
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      },
      {
        label: 'Цель',
        data: Array.from({ length: labels.length }, () => props.targetAmount),
        borderColor: colors.risk,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  animation: false,
  scales: {
    x: {
      ticks: {
        color: colors.text,
        maxTicksLimit: 8,
        font: { size: 11 },
      },
      grid: { color: colors.grid },
    },
    y: {
      ticks: {
        color: colors.text,
        font: { size: 11 },
        callback: (value: string | number) =>
          new Intl.NumberFormat('ru-RU', {
            notation: 'compact',
            maximumFractionDigits: 1,
          }).format(Number(value)),
      },
      grid: { color: colors.grid },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...tooltipConfig(),
      callbacks: {
        label: (context: TooltipItem<'line'>) => {
          const rawValue = typeof context.raw === 'number' ? context.raw : Number(context.raw)
          if (!Number.isFinite(rawValue))
            return context.dataset.label ?? ''

          return `${context.dataset.label}: ${new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: props.currencyCode,
            maximumFractionDigits: 0,
          }).format(rawValue)}`
        },
      },
    },
  },
}))
</script>

<template>
  <div class="fan-chart-card">
    <div
      v-if="loading"
      class="fan-chart-skeleton"
    >
      <Skeleton height="360px" />
    </div>

    <div
      v-else-if="result && chartData"
      class="fan-chart-container"
      role="img"
      :aria-label="`График симуляции Монте-Карло для цели ${targetAmount} ${currencyCode}`"
    >
      <Chart
        type="line"
        :data="chartData"
        :options="chartOptions"
        :style="{ height: '360px', width: '100%' }"
      />
    </div>

    <div
      v-else
      class="fan-chart-empty"
    >
      <p>Нет данных для отображения.</p>
    </div>
  </div>
</template>

<style scoped>
.fan-chart-card {
  width: 100%;
}

.fan-chart-container {
  width: 100%;
  height: 360px;
}

.fan-chart-skeleton,
.fan-chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 360px;
}

.fan-chart-empty p {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}
</style>
