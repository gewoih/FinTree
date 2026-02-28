<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, TooltipItem, Plugin } from 'chart.js';
import Skeleton from 'primevue/skeleton';
import Message from 'primevue/message';
import UiButton from '../../ui/UiButton.vue';
import Chart from 'primevue/chart';
import type { ForecastSummary } from '@/types/analytics.ts';
import { useChartColors } from '@/composables/useChartColors.ts';

const props = withDefaults(defineProps<{
  loading: boolean;
  error: string | null;
  forecast: ForecastSummary | null;
  chartData: ChartData<'line', Array<number | null>, string> | null;
  currency: string;
  isCurrentMonth?: boolean;
  readinessMet?: boolean;
  readinessMessage?: string;
  observedExpenseDays?: number;
  requiredExpenseDays?: number;
}>(), {
  isCurrentMonth: true,
  readinessMet: true,
  readinessMessage: 'Недостаточно данных, продолжайте добавлять транзакции',
  observedExpenseDays: 0,
  requiredExpenseDays: 7,
});

const emit = defineEmits<{
  (event: 'retry'): void;
}>();

const { colors, tooltipConfig } = useChartColors();

const hasActualData = computed(() =>
  (props.chartData?.datasets[0]?.data as Array<number | null> | undefined)
    ?.some((v) => v != null) ?? false
);

const hasForecast = computed(
  () => props.forecast?.optimisticTotal != null && props.forecast?.riskTotal != null
);

const showEmpty = computed(
  () =>
    props.readinessMet &&
    !props.loading &&
    !props.error &&
    (!props.chartData || !hasActualData.value)
);

const fmt = (value: number | null | undefined) => {
  if (value == null) return '—';
  let rounded = value;
  let fractionDigits = 0;
  if (Math.abs(value) < 1000) {
    fractionDigits = 2;
  } else if (Math.abs(value) >= 100000) {
    rounded = Math.round(value / 100) * 100;
  }
  return rounded.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const baselineComparison = computed(() => {
  const forecast = props.forecast;
  if (!forecast?.baselineLimit || !forecast.optimisticTotal || !forecast.riskTotal) return null;
  const midpoint = (forecast.optimisticTotal + forecast.riskTotal) / 2;
  const diff = forecast.baselineLimit - midpoint;
  const pct = Math.round(Math.abs(diff) / forecast.baselineLimit * 100);
  const isBelow = diff > 0;
  return {
    text: `На ${fmt(Math.abs(diff))} (${pct}%) ${isBelow ? 'ниже' : 'выше'} базовых расходов`,
    isBelow,
  };
});

const formattedRange = computed(() =>
  `${fmt(props.forecast?.optimisticTotal)} — ${fmt(props.forecast?.riskTotal)}`
);
const formattedActual = computed(() => fmt(props.forecast?.currentSpent));
const formattedLimit = computed(() => fmt(props.forecast?.baselineLimit));
const hasBaseline = computed(() => props.forecast?.baselineLimit != null);

const heroLabel = computed(() => {
  if (!props.isCurrentMonth) return 'Итого за месяц';
  if (hasForecast.value) return 'Прогноз до конца месяца';
  return 'Расходы за месяц';
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
    ctx.font = `600 11px Inter`;
    ctx.fillStyle = colors.baseline;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(formattedLimit.value, x, y - 4);
    ctx.restore();
  },
}));

const chartMaxY = computed<number | undefined>(() => {
  if (!props.chartData?.datasets?.length) return undefined;
  let max = 0;
  for (const ds of props.chartData.datasets) {
    for (const v of ds.data as Array<number | null>) {
      if (v != null && v > max) max = v;
    }
  }
  if (max === 0) return undefined;
  const padded = max * 1.1;
  const roundTo = padded < 10_000 ? 1_000 : padded < 100_000 ? 5_000 : 10_000;
  return Math.ceil(padded / roundTo) * roundTo;
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
      beginAtZero: false,
      max: chartMaxY.value,
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
          v-tooltip="{ value: 'Прогноз расходов до конца месяца на основе исторического темпа трат. Коридор показывает диапазон вероятных итогов.', event: 'click', autoHide: false }"
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
        <Skeleton
          width="200px"
          height="20px"
        />
        <Skeleton
          width="260px"
          height="44px"
        />
      </div>

      <div
        v-else-if="!error && readinessMet && !showEmpty"
        class="forecast-kpi"
      >
        <div class="forecast-hero">
          <span class="forecast-hero__label">{{ heroLabel }}</span>
          <span class="forecast-hero__value">{{ hasForecast ? formattedRange : formattedActual }}</span>
          <span
            v-if="hasForecast && baselineComparison"
            class="forecast-hero__baseline-note"
            :class="baselineComparison!.isBelow ? 'forecast-hero__baseline-note--below' : 'forecast-hero__baseline-note--above'"
          >
            <i :class="baselineComparison!.isBelow ? 'pi pi-arrow-down' : 'pi pi-arrow-up'" />
            {{ baselineComparison!.text }}
          </span>
        </div>
      </div>
    </div>

    <Skeleton
      v-if="loading"
      width="100%"
      height="280px"
      border-radius="16px"
    />

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
      v-else-if="!readinessMet"
      class="forecast-card__message"
    >
      <Message
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
          <span class="forecast-legend__band forecast-legend__band--corridor" />
          Коридор прогноза
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
