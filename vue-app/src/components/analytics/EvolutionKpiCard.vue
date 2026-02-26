<script setup lang="ts">
import { computed } from 'vue'
import type { TooltipItem } from 'chart.js'
import Chart from 'primevue/chart'
import {
  EVOLUTION_KPI_META,
  type EvolutionKpi,
  type EvolutionKpiCardModel,
  type EvolutionDeltaTone,
  type EvolutionValueKind,
} from '@/composables/useEvolutionTab'
import { useChartColors } from '@/composables/useChartColors'

const props = defineProps<{
  card: EvolutionKpiCardModel
  currencyCode: string
  renderChart: boolean
}>()

const { colors, tooltipConfig } = useChartColors()

function formatNumber(value: number, fractionDigits: number): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

function formatMoney(value: number, fractionDigits = 0): string {
  return value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

function formatChartValue(kind: EvolutionValueKind, precision: number, rawValue: number): string {
  switch (kind) {
    case 'ratio':
      return `${formatNumber(rawValue * 100, precision)}%`
    case 'percent':
      return `${formatNumber(rawValue, precision)}%`
    case 'currency':
      return formatMoney(rawValue, precision)
    case 'months':
      return `${formatNumber(rawValue, precision)} мес.`
    case 'score':
      return `${formatNumber(rawValue, precision)}/100`
    default:
      return '—'
  }
}

function getSeriesColor(kpi: EvolutionKpi): string {
  switch (kpi) {
    case 'savingsRate':
      return colors.palette[0] ?? colors.primary
    case 'stabilityScore':
      return colors.palette[1] ?? colors.primary
    case 'discretionaryPercent':
      return colors.palette[2] ?? colors.primary
    case 'netWorth':
      return colors.palette[3] ?? colors.primary
    case 'liquidMonths':
      return colors.palette[4] ?? colors.optimistic
    case 'meanDaily':
      return colors.forecast
    case 'peakDayRatio':
      return colors.risk
    default:
      return colors.primary
  }
}

const chartData = computed(() => {
  const seriesColor = getSeriesColor(props.card.key)

  return {
    labels: props.card.labels,
    datasets: [
      {
        data: props.card.values,
        borderColor: seriesColor,
        backgroundColor: seriesColor,
        borderWidth: 1,
        borderRadius: 8,
        maxBarThickness: 44,
        minBarLength: 4,
      },
    ],
  }
})

const chartOptions = computed(() => {
  const meta = EVOLUTION_KPI_META[props.card.key]

  return {
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: colors.text,
          font: { size: 11 },
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: {
          color: colors.grid,
        },
        ticks: {
          color: colors.text,
          font: { size: 11 },
          callback(value: number | string) {
            const numeric = typeof value === 'string' ? Number(value) : value
            if (!Number.isFinite(numeric)) return '—'
            return formatChartValue(meta.valueKind, meta.precision, numeric)
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        ...tooltipConfig(),
        callbacks: {
          label(context: TooltipItem<'bar'>) {
            const raw = context.parsed.y
            if (raw == null || Number.isNaN(raw)) {
              return `${meta.label}: —`
            }

            return `${meta.label}: ${formatChartValue(meta.valueKind, meta.precision, raw)}`
          },
        },
      },
    },
  }
})

function deltaClass(tone: EvolutionDeltaTone | null): string {
  if (tone === 'better') return 'evolution-delta--better'
  if (tone === 'worse') return 'evolution-delta--worse'
  return 'evolution-delta--neutral'
}
</script>

<template>
  <article class="evolution-card">
    <div class="evolution-card__head">
      <div class="evolution-card__title-row">
        <h3 class="evolution-card__title">
          {{ card.label }}
        </h3>
      </div>
      <p class="evolution-card__description">
        {{ card.description }}
      </p>
    </div>

    <div class="evolution-card__summary">
      <p
        v-if="card.currentValueLabel"
        class="evolution-card__current"
      >
        <span>{{ card.currentMonthLabel }}:</span>
        <strong>{{ card.currentValueLabel }}</strong>
      </p>
      <p
        v-else
        class="evolution-card__current evolution-card__current--empty"
      >
        Недостаточно данных для текущего значения
      </p>

      <p
        v-if="card.deltaLabel"
        class="evolution-card__delta"
        :class="deltaClass(card.deltaTone)"
      >
        {{ card.deltaLabel }}
      </p>

      <p
        v-if="card.statusLabel"
        class="evolution-card__status"
      >
        {{ card.statusLabel }}
      </p>

      <p
        v-if="card.actionLabel"
        class="evolution-card__action"
      >
        {{ card.actionLabel }}
      </p>
    </div>

    <div
      class="evolution-card__chart"
      role="img"
      :aria-label="`График показателя ${card.label}`"
    >
      <div
        v-if="card.hasSeriesData && renderChart"
        class="evolution-card__chart-container"
      >
        <Chart
          type="bar"
          :data="chartData"
          :options="chartOptions"
        />
      </div>

      <div
        v-else
        class="evolution-card__no-data"
      >
        Нет достаточных данных для построения графика.
      </div>
    </div>
  </article>
</template>

<style scoped>
.evolution-card {
  display: grid;
  gap: var(--ft-space-3);

  padding: var(--ft-space-3);

  background: var(--ft-surface-soft);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);
}

.evolution-card__head {
  display: grid;
  gap: var(--ft-space-1);
}

.evolution-card__title-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
  align-items: center;
}

.evolution-card__title {
  margin: 0;
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.evolution-card__direction {
  padding: 2px var(--ft-space-2);

  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);

  background: var(--ft-surface-overlay);
  border-radius: var(--ft-radius-full);
}

.evolution-card__description {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.evolution-card__summary {
  display: grid;
  gap: 2px;
}

.evolution-card__current {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: baseline;

  margin: 0;

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.evolution-card__current strong {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-primary);
}

.evolution-card__current--empty {
  color: var(--ft-text-tertiary);
}

.evolution-card__delta {
  margin: 0;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  font-variant-numeric: tabular-nums;
}

.evolution-card__status {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-primary);
}

.evolution-card__action {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.evolution-card__gap-note {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.evolution-delta--better {
  color: var(--ft-success-400);
}

.evolution-delta--worse {
  color: var(--ft-danger-400);
}

.evolution-delta--neutral {
  color: var(--ft-warning-400);
}

.evolution-card__chart {
  min-height: 330px;
}

.evolution-card__chart-container {
  position: relative;
  width: 100%;
  height: 330px;
}

/* stylelint-disable-next-line selector-pseudo-class-no-unknown */
.evolution-card__chart-container :deep(.p-chart) {
  width: 100%;
  height: 100%;
}

/* stylelint-disable-next-line selector-pseudo-class-no-unknown */
.evolution-card__chart-container :deep(canvas) {
  height: 100%;
  max-height: 100%;
}

.evolution-card__no-data {
  display: grid;
  place-items: center;

  width: 100%;
  height: 330px;

  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);

  background: var(--ft-surface-base);
  border: 1px dashed var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

@media (width <= 640px) {
  .evolution-card__chart-container,
  .evolution-card__no-data {
    height: 300px;
  }
}
</style>
