<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, TooltipItem } from 'chart.js';
import UiBadge from '@/ui/UiBadge.vue';
import UiSkeleton from '@/ui/UiSkeleton.vue';
import UiMessage from '@/ui/UiMessage.vue';
import UiButton from '../../ui/UiButton.vue';
import UiChart from '@/ui/UiChart.vue';
import type { ForecastSummary } from '@/types/analytics.ts';
import { useChartColors } from '../../composables/useChartColors';

const props = withDefaults(defineProps<{
  loading: boolean;
  error: string | null;
  forecast: ForecastSummary | null;
  chartData: ChartData<'line', Array<number | null>, string> | null;
  currency: string;
  readinessMet?: boolean;
  readinessMessage?: string;
  observedExpenseDays?: number;
  requiredExpenseDays?: number;
}>(), {
  readinessMet: true,
  readinessMessage: 'Недостаточно данных, продолжайте добавлять транзакции',
  observedExpenseDays: 0,
  requiredExpenseDays: 7,
});

const emit = defineEmits<{
  (event: 'retry'): void;
}>();

const { colors, tooltipConfig } = useChartColors();

const showEmpty = computed(
  () =>
    props.readinessMet &&
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
      grid: {
        display: false,
      },
      ticks: {
        color: colors.text,
        font: { size: 12 },
        autoSkip: true,
        maxTicksLimit: 14,
      },
    },
    y: {
      grid: { color: colors.grid, drawBorder: false },
      ticks: {
        color: colors.text,
        font: { size: 12 },
        maxTicksLimit: 8,
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
      <UiBadge
        v-if="readinessMet && statusLabel"
        :class="['forecast-chip', statusClass]"
      >
        {{ statusLabel }}
      </UiBadge>
    </div>

    <div
      v-if="loading"
      class="forecast-card__loading"
    >
      <div class="forecast-card__loading-chips">
        <UiSkeleton
          v-for="i in 3"
          :key="i"
          width="120px"
          height="32px"
          border-radius="999px"
        />
      </div>
      <UiSkeleton
        width="100%"
        height="300px"
        border-radius="16px"
      />
    </div>

    <div
      v-else-if="error"
      class="forecast-card__message"
    >
      <UiMessage
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
      </UiMessage>
    </div>

    <div
      v-else-if="!readinessMet"
      class="forecast-card__message"
    >
      <UiMessage
        severity="info"
        icon="pi pi-info-circle"
        :closable="false"
      >
        <div class="forecast-card__message-body forecast-card__message-body--compact">
          <p class="forecast-card__message-title">
            {{ readinessMessage }}
          </p>
          <p class="forecast-card__message-text">
            Нужны расходы минимум в {{ requiredExpenseDays }} днях. Сейчас: {{ observedExpenseDays }}.
          </p>
        </div>
      </UiMessage>
    </div>

    <div
      v-else-if="showEmpty"
      class="forecast-card__message"
    >
      <UiMessage
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
      </UiMessage>
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
          <UiChart
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

<style scoped src="../../styles/components/forecast-card.css"></style>
