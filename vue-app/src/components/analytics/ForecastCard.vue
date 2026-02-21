<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, TooltipItem, Plugin } from 'chart.js';
import UiSkeleton from '@/ui/UiSkeleton.vue';
import UiMessage from '@/ui/UiMessage.vue';
import UiButton from '../../ui/UiButton.vue';
import UiChart from '@/ui/UiChart.vue';
import type { ForecastSummary } from '@/types/analytics.ts';
import { useChartColors } from '@/composables/useChartColors.ts';

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
const formattedLimit = computed(() => fmt(props.forecast?.baselineLimit));
const hasBaseline = computed(() => props.forecast?.baselineLimit != null);

const heroClass = computed(() => {
  switch (props.forecast?.status) {
    case 'average': return 'forecast-hero--average';
    case 'poor': return 'forecast-hero--poor';
    default: return null;
  }
});

const baselineLabelPlugin = computed<Plugin<'line'>>(() => ({
  id: 'baselineLabel',
  afterDraw(chart) {
    if (!hasBaseline.value) return;

    const datasetIndex = chart.data.datasets.findIndex(
      ds => ds.label === 'Базовые расходы'
    );
    if (datasetIndex === -1) return;

    const meta = chart.getDatasetMeta(datasetIndex);
    if (!meta.visible || !meta.data.length) return;

    const lastPoint = meta.data[meta.data.length - 1];
    const { x, y } = lastPoint?.getProps(['x', 'y'], true) as { x: number; y: number };

    const { ctx } = chart;
    ctx.save();
    ctx.font = `600 11px sans-serif`;
    ctx.fillStyle = colors.baseline;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(formattedLimit.value, x, y - 4);
    ctx.restore();
  },
}));

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
      <div class="forecast-card__title-row">
        <h3 class="forecast-card__title">
          Прогноз расходов
        </h3>
        <button
          v-tooltip="{ value: 'Оценка расходов до конца месяца на основе текущего темпа трат. Три сценария: оптимистичный, базовый и рисковый.', event: 'click' }"
          type="button"
          class="forecast-card__hint"
          aria-label="Подсказка"
        >
          <i class="pi pi-question-circle" />
        </button>
      </div>

      <div
        v-if="loading"
        class="forecast-card__loading-kpi"
      >
        <UiSkeleton
          width="200px"
          height="20px"
        />
        <UiSkeleton
          width="260px"
          height="44px"
        />
        <div class="forecast-card__loading-secondary">
          <UiSkeleton
            width="110px"
            height="36px"
          />
          <UiSkeleton
            width="110px"
            height="36px"
          />
        </div>
      </div>

      <div
        v-else-if="!error && readinessMet && !showEmpty"
        class="forecast-kpi"
      >
        <div :class="['forecast-hero', heroClass]">
          <span class="forecast-hero__label">Прогноз до конца месяца</span>
          <span class="forecast-hero__value">{{ formattedForecast }}</span>
        </div>
        <div class="forecast-secondary">
          <div class="forecast-stat forecast-stat--optimistic">
            <span class="forecast-stat__label">Оптимистичный</span>
            <span class="forecast-stat__value">{{ formattedOptimistic }}</span>
          </div>
          <div class="forecast-stat forecast-stat--risk">
            <span class="forecast-stat__label">Риск</span>
            <span class="forecast-stat__value">{{ formattedRisk }}</span>
          </div>
        </div>
      </div>
    </div>

    <UiSkeleton
      v-if="loading"
      width="100%"
      height="300px"
      border-radius="16px"
    />

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
            :plugins="hasBaseline ? [baselineLabelPlugin] : []"
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
