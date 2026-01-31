<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import type { ForecastSummary } from '../../types/analytics';

const props = defineProps<{
  loading: boolean;
  error: string | null;
  forecast: ForecastSummary | null;
  chartData: any | null;
  currency: string;
  monthLabel: string;
  canNavigateNext: boolean;
}>();

const emit = defineEmits<{
  (event: 'retry'): void;
  (event: 'navigate-prev'): void;
  (event: 'navigate-next'): void;
}>();

const textColor = ref('#1e293b');
const gridColor = ref('rgba(148,163,184,0.2)');

const updateColors = () => {
  if (typeof window === 'undefined') return;
  const styles = getComputedStyle(document.documentElement);
  textColor.value = styles.getPropertyValue('--ft-text-primary').trim() || '#1e293b';
  gridColor.value = styles.getPropertyValue('--ft-border-subtle').trim() || 'rgba(148,163,184,0.2)';
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

const formattedForecast = computed(() => {
  const value = props.forecast?.forecastTotal;
  if (value == null) return '—';
  return value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: 0,
  });
});

const formattedCurrent = computed(() => {
  const value = props.forecast?.currentSpent;
  if (value == null) return '—';
  return value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: 0,
  });
});

const formattedLimit = computed(() => {
  const value = props.forecast?.baselineLimit;
  if (value == null) return '—';
  return value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: 0,
  });
});

const hasBaseline = computed(() => props.forecast?.baselineLimit != null);

const remainingAmount = computed(() => {
  const forecastTotal = props.forecast?.forecastTotal;
  const currentSpent = props.forecast?.currentSpent;
  if (forecastTotal == null || currentSpent == null) return null;
  return forecastTotal - currentSpent;
});

const remainingText = computed(() => {
  if (remainingAmount.value == null) return null;
  const formatted = Math.abs(remainingAmount.value).toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: 0,
  });
  return remainingAmount.value >= 0
    ? `Осталось ориентировочно ${formatted} до конца месяца.`
    : `Вы уже превысили прогноз на ${formatted}.`;
});

const statusLabel = computed(() => {
  switch (props.forecast?.status) {
    case 'good':
      return 'Ниже лимита';
    case 'average':
      return 'Близко к лимиту';
    case 'poor':
      return 'Превышает лимит';
    default:
      return null;
  }
});

const statusClass = computed(() => {
  switch (props.forecast?.status) {
    case 'good':
      return 'forecast-card__status--good';
    case 'average':
      return 'forecast-card__status--average';
    case 'poor':
      return 'forecast-card__status--poor';
    default:
      return null;
  }
});

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: {
        color: gridColor.value,
      },
      ticks: {
        color: textColor.value,
      },
    },
    y: {
      grid: {
        color: gridColor.value,
        drawBorder: false,
      },
      ticks: {
        color: textColor.value,
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
    legend: {
      display: true,
      align: 'start',
      labels: {
        color: textColor.value,
        usePointStyle: true,
      },
    },
    tooltip: {
      callbacks: {
        label(context: any) {
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
  <Card class="analytics-card">
    <template #title>
      <div class="card-head">
        <div>
          <h3>Прогноз расходов</h3>
          <p>Как изменится траектория трат до конца месяца</p>
        </div>
        <div class="card-controls">
          <div class="month-nav">
            <button
              type="button"
              class="month-nav__button"
              aria-label="Предыдущий месяц"
              @click="emit('navigate-prev')"
            >
              <i class="pi pi-chevron-left" />
            </button>
            <span class="month-nav__label">{{ monthLabel }}</span>
            <button
              type="button"
              class="month-nav__button"
              aria-label="Следующий месяц"
              :disabled="!canNavigateNext"
              @click="emit('navigate-next')"
            >
              <i class="pi pi-chevron-right" />
            </button>
          </div>
          <Tag
            v-if="statusLabel"
            :class="['forecast-card__status', statusClass]"
          >
            {{ statusLabel }}
          </Tag>
        </div>
      </div>
    </template>

    <template #content>
      <div
        v-if="loading"
        class="card-loading"
      >
        <Skeleton
          width="70%"
          height="24px"
        />
        <Skeleton
          width="60%"
          height="18px"
        />
        <Skeleton
          width="100%"
          height="320px"
          border-radius="20px"
        />
      </div>

      <div
        v-else-if="error"
        class="card-message"
      >
        <Message
          severity="error"
          icon="pi pi-exclamation-triangle"
          :closable="false"
        >
          <div class="card-message__body">
            <p class="card-message__title">
              Не удалось построить прогноз
            </p>
            <p class="card-message__text">
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
        class="card-message"
      >
        <Message
          severity="info"
          icon="pi pi-inbox"
          :closable="false"
        >
          <div class="card-message__body card-message__body--compact">
            <p class="card-message__title">
              Недостаточно данных для прогноза
            </p>
            <p class="card-message__text">
              Нужны ежедневные расходы за текущий месяц. Предыдущий месяц нужен только для сравнения с лимитом.
            </p>
          </div>
        </Message>
      </div>

      <div
        v-else
        class="forecast-card__body"
      >
        <div class="forecast-card__summary">
          <p class="forecast-card__lead">
            При текущем темпе трат вы выйдете на сумму ≈
            <strong>{{ formattedForecast }}</strong> к концу месяца.
          </p>
          <p
            v-if="remainingText"
            class="forecast-card__remaining"
          >
            {{ remainingText }}
          </p>
          <p class="forecast-card__support">
            Уже потрачено: <strong>{{ formattedCurrent }}</strong>
            <template v-if="hasBaseline">
              из ориентировочного лимита {{ formattedLimit }}.
            </template>
            <template v-else>
              за текущий период без установленного лимита.
            </template>
          </p>
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
      </div>
    </template>
  </Card>
</template>

<style scoped>
.analytics-card {
  background: var(--ft-surface-base);
  border-radius: var(--ft-radius-2xl);
  border: 1px solid var(--ft-border-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  padding-bottom: var(--ft-space-3);
  box-shadow: var(--ft-shadow-sm);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ft-space-4);
}

.card-head h3 {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.card-head p {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-secondary);
}

.card-controls {
  display: grid;
  justify-items: end;
  gap: var(--ft-space-2);
}

.month-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ft-border-subtle) 70%, transparent);
  background: color-mix(in srgb, var(--ft-surface-raised) 85%, transparent);
}

.month-nav__label {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  min-width: 120px;
  text-align: center;
}

.month-nav__button {
  border: none;
  background: transparent;
  color: var(--ft-text-secondary);
  font-size: 0.85rem;
  padding: 0.2rem;
  border-radius: 999px;
  cursor: pointer;
  transition: color var(--ft-transition-fast), background-color var(--ft-transition-fast);
}

.month-nav__button:hover:not(:disabled) {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-surface-base) 70%, transparent);
}

.month-nav__button:disabled {
  opacity: 0.4;
  cursor: default;
}

.forecast-card__status {
  font-weight: var(--ft-font-semibold);
  border-radius: var(--ft-radius-full);
  padding: 0.35rem 0.85rem;
}

.forecast-card__status--good {
  background: color-mix(in srgb, var(--ft-success-200) 55%, transparent) !important;
  color: var(--ft-success-700) !important;
}

.forecast-card__status--average {
  background: color-mix(in srgb, var(--ft-warning-200) 55%, transparent) !important;
  color: var(--ft-warning-700) !important;
}

.forecast-card__status--poor {
  background: color-mix(in srgb, var(--ft-danger-200) 55%, transparent) !important;
  color: var(--ft-danger-700) !important;
}

.card-loading {
  display: grid;
  gap: var(--ft-space-3);
}

.card-message {
  display: grid;
}

.card-message__body {
  display: grid;
  gap: var(--ft-space-3);
}

.card-message__body--compact {
  gap: var(--ft-space-2);
}

.card-message__title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.card-message__text {
  margin: 0;
}

.forecast-card__body {
  display: grid;
  gap: var(--ft-space-4);
}

.forecast-card__lead {
  margin: 0;
  font-size: var(--ft-text-lg);
  color: var(--ft-text-primary);
  line-height: var(--ft-leading-relaxed);
}

.forecast-card__support {
  margin: 0;
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-sm);
}

.forecast-card__remaining {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-primary);
}

.forecast-card__chart {
  height: 450px;
  width: 100%;
  padding: var(--ft-space-4) var(--ft-space-3);
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
</style>
