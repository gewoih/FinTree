<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, TooltipItem } from 'chart.js';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';
import Message from 'primevue/message';
import UiButton from '../../ui/UiButton.vue';
import Chart from 'primevue/chart';
import type { ForecastSummary } from '@/types/analytics.ts';
import { useChartColors } from '../../composables/useChartColors';

const props = defineProps<{
  loading: boolean;
  error: string | null;
  forecast: ForecastSummary | null;
  chartData: ChartData<'line', Array<number | null>, string> | null;
  currency: string;
}>();

const emit = defineEmits<{
  (event: 'retry'): void;
}>();

const { colors, tooltipConfig } = useChartColors();

const showEmpty = computed(
  () =>
    !props.loading &&
    !props.error &&
    (!props.forecast ||
      props.forecast.forecastTotal == null ||
      props.forecast.currentSpent == null ||
      !props.chartData)
);

const fmt = (value: number | null | undefined) => {
  if (value == null) return '—';
  return value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: 0,
  });
};

const formattedForecast = computed(() => fmt(props.forecast?.forecastTotal));
const formattedOptimistic = computed(() => fmt(props.forecast?.optimisticTotal));
const formattedRisk = computed(() => fmt(props.forecast?.riskTotal));
const formattedCurrent = computed(() => fmt(props.forecast?.currentSpent));
const formattedLimit = computed(() => fmt(props.forecast?.baselineLimit));
const hasBaseline = computed(() => props.forecast?.baselineLimit != null);

const statusLabel = computed(() => {
  switch (props.forecast?.status) {
    case 'good': return 'Ниже лимита';
    case 'average': return 'Близко к лимиту';
    case 'poor': return 'Превышает лимит';
    default: return null;
  }
});

const statusClass = computed(() => {
  switch (props.forecast?.status) {
    case 'good': return 'forecast-chip--good';
    case 'average': return 'forecast-chip--average';
    case 'poor': return 'forecast-chip--poor';
    default: return null;
  }
});

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { color: colors.grid },
      ticks: { color: colors.text, font: { size: 12 } },
    },
    y: {
      grid: { color: colors.grid, drawBorder: false },
      ticks: {
        color: colors.text,
        font: { size: 12 },
        callback(value: number | string) {
          const numeric = typeof value === 'string' ? Number(value) : value;
          return numeric.toLocaleString('ru-RU', {
            style: 'currency',
            currency: props.currency,
            maximumFractionDigits: 0,
          });
        },
      },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...tooltipConfig(),
      callbacks: {
        label(context: TooltipItem<'line'>) {
          const label = context.dataset.label ?? '';
          const value = context.parsed.y ?? 0;
          const formatted = value.toLocaleString('ru-RU', {
            style: 'currency',
            currency: props.currency,
            minimumFractionDigits: 0,
          });
          return `${label}: ${formatted}`;
        },
      },
    },
  },
}));
</script>

<template>
  <div class="forecast-card">
    <div class="forecast-card__head">
      <div>
        <div class="forecast-card__title-row">
          <h3 class="forecast-card__title">
            Прогноз расходов
          </h3>
          <i
            v-tooltip.top="'Оценка расходов до конца месяца на основе текущего темпа трат. Три сценария: оптимистичный, базовый и рисковый.'"
            class="pi pi-question-circle forecast-card__hint"
          />
        </div>
        <p class="forecast-card__subtitle">
          Оценка расходов до конца месяца
        </p>
      </div>
      <Tag
        v-if="statusLabel"
        :class="['forecast-chip', statusClass]"
      >
        {{ statusLabel }}
      </Tag>
    </div>

    <div
      v-if="loading"
      class="forecast-card__loading"
    >
      <div class="forecast-card__loading-chips">
        <Skeleton
          v-for="i in 3"
          :key="i"
          width="120px"
          height="32px"
          border-radius="999px"
        />
      </div>
      <Skeleton
        width="100%"
        height="300px"
        border-radius="16px"
      />
    </div>

    <div
      v-else-if="error"
      class="forecast-card__message"
    >
      <Message
        severity="error"
        icon="pi pi-exclamation-triangle"
        :closable="false"
      >
        <div class="forecast-card__message-body">
          <p class="forecast-card__message-title">
            Не удалось построить прогноз
          </p>
          <p class="forecast-card__message-text">
            {{ error }}
          </p>
          <UiButton
            label="Повторить"
            icon="pi pi-refresh"
            size="sm"
            @click="emit('retry')"
          />
        </div>
      </Message>
    </div>

    <div
      v-else-if="showEmpty"
      class="forecast-card__message"
    >
      <Message
        severity="info"
        icon="pi pi-inbox"
        :closable="false"
      >
        <div class="forecast-card__message-body forecast-card__message-body--compact">
          <p class="forecast-card__message-title">
            Недостаточно данных для прогноза
          </p>
          <p class="forecast-card__message-text">
            Нужны ежедневные расходы за текущий месяц.
          </p>
        </div>
      </Message>
    </div>

    <template v-else>
      <div class="forecast-card__chips">
        <div class="forecast-chip forecast-chip--accent">
          <span class="forecast-chip__label">Потрачено</span>
          <span class="forecast-chip__value">{{ formattedCurrent }}</span>
        </div>
        <div class="forecast-chip forecast-chip--primary">
          <span class="forecast-chip__label">Прогноз</span>
          <span class="forecast-chip__value">{{ formattedForecast }}</span>
        </div>
        <div class="forecast-chip forecast-chip--muted">
          <span class="forecast-chip__label">Оптимист.</span>
          <span class="forecast-chip__value">{{ formattedOptimistic }}</span>
        </div>
        <div class="forecast-chip forecast-chip--warning">
          <span class="forecast-chip__label">Риск</span>
          <span class="forecast-chip__value">{{ formattedRisk }}</span>
        </div>
        <div
          v-if="hasBaseline"
          class="forecast-chip forecast-chip--outline"
        >
          <span class="forecast-chip__label">Базовые расходы</span>
          <span class="forecast-chip__value">{{ formattedLimit }}</span>
        </div>
      </div>

      <div
        class="forecast-card__chart"
        role="img"
        aria-label="График прогноза расходов"
      >
        <div class="forecast-card__chart-container">
          <Chart
            v-if="chartData"
            type="line"
            :data="chartData"
            :options="chartOptions"
          />
        </div>
      </div>

      <div class="forecast-card__legend">
        <span class="forecast-legend__item">
          <span class="forecast-legend__line forecast-legend__line--actual" />
          Факт
        </span>
        <span class="forecast-legend__item">
          <span class="forecast-legend__line forecast-legend__line--forecast" />
          Прогноз
        </span>
        <span class="forecast-legend__item">
          <span class="forecast-legend__line forecast-legend__line--optimistic" />
          Оптимистичный
        </span>
        <span class="forecast-legend__item">
          <span class="forecast-legend__line forecast-legend__line--risk" />
          Риск
        </span>
        <span
          v-if="hasBaseline"
          class="forecast-legend__item"
        >
          <span class="forecast-legend__line forecast-legend__line--baseline" />
          Базовые расходы
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.forecast-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  padding: clamp(1rem, 2vw, 1.5rem);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-2xl);
  box-shadow: var(--ft-shadow-sm);
}

.forecast-card__head {
  display: flex;
  gap: var(--ft-space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.forecast-card__title-row {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.forecast-card__title {
  margin: 0;

  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.forecast-card__hint {
  cursor: help;
  font-size: 0.85rem;
  color: var(--ft-text-muted);
  transition: color var(--ft-transition-fast);
}

.forecast-card__hint:hover {
  color: var(--ft-text-secondary);
}

.forecast-card__subtitle {
  margin: var(--ft-space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.forecast-card__loading {
  display: grid;
  gap: var(--ft-space-3);
}

.forecast-card__loading-chips {
  display: flex;
  gap: var(--ft-space-2);
}

.forecast-card__message {
  display: grid;
}

.forecast-card__message-body {
  display: grid;
  gap: var(--ft-space-3);
}

.forecast-card__message-body--compact {
  gap: var(--ft-space-2);
}

.forecast-card__message-title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.forecast-card__message-text {
  margin: 0;
}

/* Chips */
.forecast-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
}

.forecast-chip {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;

  padding: var(--ft-space-3) var(--ft-space-4);

  font-size: var(--ft-text-sm);

  background: color-mix(in srgb, var(--ft-surface-raised) 60%, transparent);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);
}

.forecast-chip__label {
  font-size: var(--ft-text-lg);
  color: var(--ft-text-secondary);
}

.forecast-chip__value {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-bold);
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-primary);
}

.forecast-chip--accent {
  border-color: color-mix(in srgb, var(--ft-info-400) 30%, var(--ft-border-subtle));
}

.forecast-chip--accent .forecast-chip__value {
  color: var(--ft-info-400);
}

.forecast-chip--primary {
  border-color: color-mix(in srgb, var(--ft-primary-400) 30%, var(--ft-border-subtle));
}

.forecast-chip--primary .forecast-chip__value {
  color: var(--ft-primary-400);
}

.forecast-chip--warning {
  border-color: color-mix(in srgb, var(--ft-warning-400) 30%, var(--ft-border-subtle));
}

.forecast-chip--warning .forecast-chip__value {
  color: var(--ft-warning-400);
}

.forecast-chip--outline {
  background: transparent;
  border-style: dashed;
}

.forecast-chip--good {
  flex-direction: row;

  padding: 0.35rem 0.85rem;

  font-weight: var(--ft-font-semibold);
  color: var(--ft-success-700) !important;

  background: color-mix(in srgb, var(--ft-success-200) 55%, transparent) !important;
  border: none;
  border-radius: var(--ft-radius-full);
}

.forecast-chip--average {
  flex-direction: row;

  padding: 0.35rem 0.85rem;

  font-weight: var(--ft-font-semibold);
  color: var(--ft-warning-700) !important;

  background: color-mix(in srgb, var(--ft-warning-200) 55%, transparent) !important;
  border: none;
  border-radius: var(--ft-radius-full);
}

.forecast-chip--poor {
  flex-direction: row;

  padding: 0.35rem 0.85rem;

  font-weight: var(--ft-font-semibold);
  color: var(--ft-danger-700) !important;

  background: color-mix(in srgb, var(--ft-danger-200) 55%, transparent) !important;
  border: none;
  border-radius: var(--ft-radius-full);
}

/* Chart */
.forecast-card__chart {
  width: 100%;
  height: 400px;
}

.forecast-card__chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.forecast-card__chart-container :deep(.p-chart) {
  width: 100%;
  height: 100%;
}

.forecast-card__chart-container :deep(canvas) {
  height: 100%;
  max-height: 100%;
}

/* Integrated legend */
.forecast-card__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
  padding-top: var(--ft-space-1);
}

.forecast-legend__item {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-size: var(--ft-text-lg);
  color: var(--ft-text-secondary);
}

.forecast-legend__line {
  display: inline-block;
  width: 20px;
  height: 2px;
  border-radius: 999px;
}

.forecast-legend__line--actual {
  background: var(--ft-info-400);
}

.forecast-legend__line--forecast {
  height: 0;
  background: var(--ft-primary-400);
  border-top: 2px dashed var(--ft-primary-400);
}

.forecast-legend__line--optimistic {
  height: 0;
  background: var(--ft-info-400);
  border-top: 2px dashed var(--ft-info-400);
}

.forecast-legend__line--risk {
  height: 0;
  background: var(--ft-chart-risk);
  border-top: 2px dashed var(--ft-chart-risk);
}

.forecast-legend__line--baseline {
  height: 0;
  background: var(--ft-border-subtle);
  border-top: 2px dashed var(--ft-border-subtle);
}

@media (width <= 640px) {
  .forecast-card__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .forecast-card__chips {
    gap: var(--ft-space-1);
  }

  .forecast-chip {
    padding: var(--ft-space-1) var(--ft-space-2);
  }

  .forecast-chip__label {
    font-size: var(--ft-text-sm);
  }

  .forecast-chip__value {
    font-size: var(--ft-text-xs);
  }

  .forecast-card__chart {
    height: 280px;
  }

  .forecast-legend__item {
    font-size: var(--ft-text-sm);
  }
}
</style>
