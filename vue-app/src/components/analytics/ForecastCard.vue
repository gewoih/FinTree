<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import type { ChartData, TooltipItem } from 'chart.js';
import type { ForecastSummary } from '../../types/analytics';

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

const textColor = ref('#1e293b');
const gridColor = ref('rgba(148,163,184,0.2)');
const surfaceRaised = ref('#1e293b');

const updateColors = () => {
  if (typeof window === 'undefined') return;
  const styles = getComputedStyle(document.documentElement);
  textColor.value = styles.getPropertyValue('--ft-text-primary').trim() || '#1e293b';
  gridColor.value = styles.getPropertyValue('--ft-border-subtle').trim() || 'rgba(148,163,184,0.2)';
  surfaceRaised.value = styles.getPropertyValue('--ft-surface-raised').trim() || '#1e293b';
};

onMounted(() => {
  updateColors();
  const observer = new MutationObserver(updateColors);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

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
      grid: { color: gridColor.value },
      ticks: { color: textColor.value, font: { size: 12 } },
    },
    y: {
      grid: { color: gridColor.value, drawBorder: false },
      ticks: {
        color: textColor.value,
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
      backgroundColor: surfaceRaised.value,
      titleColor: textColor.value,
      bodyColor: textColor.value,
      borderColor: gridColor.value,
      borderWidth: 1,
      cornerRadius: 10,
      padding: 12,
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
        <h3
          v-tooltip.top="'Оценка расходов до конца месяца на основе текущего темпа трат. Три сценария: оптимистичный, базовый и рисковый.'"
          class="forecast-card__title"
        >
          Прогноз расходов
        </h3>
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
          <Button
            label="Повторить"
            icon="pi pi-refresh"
            size="small"
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
          <span class="forecast-chip__label">Лимит</span>
          <span class="forecast-chip__value">{{ formattedLimit }}</span>
        </div>
      </div>

      <div class="forecast-card__chart">
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
          Базовый
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
          Лимит
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
  border-radius: var(--ft-radius-2xl);
  border: 1px solid var(--ft-border-subtle);
  box-shadow: var(--ft-shadow-sm);
}

.forecast-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ft-space-4);
}

.forecast-card__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  cursor: help;
}

.forecast-card__subtitle {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-sm);
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
  border-radius: var(--ft-radius-lg);
  font-size: var(--ft-text-sm);
  border: 1px solid var(--ft-border-subtle);
  background: color-mix(in srgb, var(--ft-surface-raised) 60%, transparent);
}

.forecast-chip__label {
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-lg);
}

.forecast-chip__value {
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  font-size: var(--ft-text-base);
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
  background: color-mix(in srgb, var(--ft-success-200) 55%, transparent) !important;
  color: var(--ft-success-700) !important;
  border: none;
  font-weight: var(--ft-font-semibold);
  border-radius: var(--ft-radius-full);
  padding: 0.35rem 0.85rem;
  flex-direction: row;
}

.forecast-chip--average {
  background: color-mix(in srgb, var(--ft-warning-200) 55%, transparent) !important;
  color: var(--ft-warning-700) !important;
  border: none;
  font-weight: var(--ft-font-semibold);
  border-radius: var(--ft-radius-full);
  padding: 0.35rem 0.85rem;
  flex-direction: row;
}

.forecast-chip--poor {
  background: color-mix(in srgb, var(--ft-danger-200) 55%, transparent) !important;
  color: var(--ft-danger-700) !important;
  border: none;
  font-weight: var(--ft-font-semibold);
  border-radius: var(--ft-radius-full);
  padding: 0.35rem 0.85rem;
  flex-direction: row;
}

/* Chart */
.forecast-card__chart {
  height: 400px;
  width: 100%;
}

.forecast-card__chart-container {
  position: relative;
  height: 100%;
  width: 100%;
}

.forecast-card__chart-container :deep(.p-chart) {
  height: 100%;
  width: 100%;
}

.forecast-card__chart-container :deep(canvas) {
  max-height: 100%;
  height: 100%;
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
  align-items: center;
  gap: var(--ft-space-2);
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
  background: var(--ft-primary-400);
  border-top: 2px dashed var(--ft-primary-400);
  height: 0;
}

.forecast-legend__line--optimistic {
  background: var(--ft-info-400);
  border-top: 2px dashed var(--ft-info-400);
  height: 0;
}

.forecast-legend__line--risk {
  background: #f97316;
  border-top: 2px dashed #f97316;
  height: 0;
}

.forecast-legend__line--baseline {
  background: var(--ft-border-subtle);
  border-top: 2px dashed var(--ft-border-subtle);
  height: 0;
}

@media (max-width: 640px) {
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

  .forecast-chip__value {
    font-size: var(--ft-text-xs);
  }

  .forecast-card__chart {
    height: 280px;
  }
}
</style>
