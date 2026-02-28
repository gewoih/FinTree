<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, ChartDataset, TooltipItem, Plugin } from 'chart.js';
import UiButton from '../../ui/UiButton.vue';
import Skeleton from 'primevue/skeleton';
import Message from 'primevue/message';
import Chart from 'primevue/chart';
import Select from 'primevue/select';
import type { ExpenseGranularity } from '@/types/analytics.ts';
import { useChartColors } from '@/composables/useChartColors.ts';

const props = defineProps<{
  loading: boolean;
  error: string | null;
  granularity: ExpenseGranularity;
  granularityOptions: Array<{ label: string; value: ExpenseGranularity }>;
  chartData: ChartData<'bar', number[], string> | null;
  empty: boolean;
  currency: string;
}>();

const emit = defineEmits<{
  (event: 'update:granularity', value: ExpenseGranularity): void;
  (event: 'retry'): void;
}>();

const { colors, tooltipConfig } = useChartColors();

const averageValue = computed(() => {
  if (!props.chartData?.datasets?.[0]?.data) return null;
  const data = props.chartData.datasets[0].data as number[];
  const nonZero = data.filter(v => v > 0);
  if (!nonZero.length) return null;
  return nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
});

const maxValue = computed(() => {
  if (!props.chartData?.datasets?.[0]?.data) return null;
  const nonZero = (props.chartData.datasets[0].data as number[]).filter(v => v > 0);
  if (!nonZero.length) return null;
  return Math.max(...nonZero);
});

const isCapped = computed(() => {
  if (averageValue.value == null || maxValue.value == null || averageValue.value === 0) return false;
  return maxValue.value / averageValue.value > 3;
});

const cappedMax = computed<number | null>(() => {
  if (!isCapped.value || !props.chartData?.datasets?.[0]?.data) return null;
  const nonZero = (props.chartData.datasets[0].data as number[])
    .filter(v => v > 0)
    .sort((a, b) => a - b);
  if (!nonZero.length) return null;
  const p85 = nonZero[Math.min(Math.floor(nonZero.length * 0.85), nonZero.length - 1)];
  if (p85 == null) return null;
  const raw = p85 * 1.2;
  const roundTo = raw < 1000 ? 100 : raw < 10000 ? 1000 : raw < 100000 ? 5000 : 10000;
  return Math.ceil(raw / roundTo) * roundTo;
});

const formattedAverage = computed(() => {
  if (averageValue.value == null) return null;
  return averageValue.value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    maximumFractionDigits: 0,
  });
});

const spikeLabelsPlugin = computed<Plugin<'bar'>>(() => ({
  id: 'spikeLabels',
  afterDraw(chart) {
    if (!isCapped.value || cappedMax.value == null) return;

    const { ctx, chartArea, data } = chart;
    const meta = chart.getDatasetMeta(0);
    const rawData = (data.datasets[0]?.data ?? []) as number[];

    meta.data.forEach((el, i) => {
      const value = rawData[i];
      if (value == null || cappedMax.value == null || value <= cappedMax.value) return;

      const barEl = el as unknown as { x: number; y: number; width: number };
      const barLeft = barEl.x - barEl.width / 2;
      const barRight = barEl.x + barEl.width / 2;

      // Zigzag at the cut-off edge of the bar
      const zigY = chartArea.top;
      const zigH = 5;
      const steps = Math.max(4, Math.floor(barEl.width / 6));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(barLeft, zigY);
      for (let z = 0; z < steps; z++) {
        const x = barLeft + (barRight - barLeft) * ((z + 1) / steps);
        const y = zigY + (z % 2 === 0 ? zigH : 0);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = colors.surface;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'miter';
      ctx.stroke();
      ctx.restore();

      // Currency label in the padding space above chartArea
      const label = value.toLocaleString('ru-RU', {
        style: 'currency',
        currency: props.currency,
        maximumFractionDigits: 0,
      });

      ctx.save();
      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const padX = 5;
      const padY = 3;
      const textWidth = ctx.measureText(label).width;
      const pillW = textWidth + padX * 2;
      const pillH = 18;
      const pillX = barEl.x - pillW / 2;
      const pillY = chartArea.top - pillH - 6;

      ctx.fillStyle = colors.tooltipBg;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
      ctx.fill();

      ctx.fillStyle = colors.tooltipText;
      ctx.fillText(label, barEl.x, pillY + padY);
      ctx.restore();
    });
  },
}));

const styledChartData = computed(() => {
  if (!props.chartData) return null;
  const datasets = [...props.chartData.datasets] as ChartDataset<'bar' | 'line', number[]>[];

  if (averageValue.value != null) {
    const len = props.chartData.labels?.length ?? 0;
    const averageDataset: ChartDataset<'line', number[]> = {
      label: 'Среднее',
      data: Array(len).fill(averageValue.value),
      type: 'line' as const,
      borderColor: colors.tooltipSecondary,
      borderDash: [5, 3],
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
    };
    datasets.push(averageDataset);
  }

  return {
    ...props.chartData,
    datasets,
  };
});

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  layout: {
    padding: { top: isCapped.value ? 28 : 0 },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: colors.text,
        font: { size: 12 },
      },
    },
    y: {
      ...(cappedMax.value != null ? { max: cappedMax.value } : {}),
      grid: {
        color: colors.grid,
      },
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
    legend: {
      display: false,
    },
    tooltip: {
      ...tooltipConfig(),
      padding: 14,
      titleFont: { size: 13 },
      bodyFont: { size: 13 },
      callbacks: {
        label(context: TooltipItem<'bar'>) {
          const value = context.parsed.y ?? 0;
          const formatted = value.toLocaleString('ru-RU', {
            style: 'currency',
            currency: props.currency,
            minimumFractionDigits: 0,
          });
          if (context.dataset.label === 'Среднее') {
            return `Среднее: ${formatted}`;
          }
          return `Расходы: ${formatted}`;
        },
      },
    },
  },
}));
</script>

<template>
  <div class="bars-card">
    <div class="bars-card__head">
      <div>
        <div class="bars-card__title-row">
          <h3 class="bars-card__title">
            Динамика расходов
          </h3>
          <button
            v-tooltip="{ value: 'Как менялись расходы день за днём, по неделям или месяцам. Пунктирная линия — среднее значение.', event: 'click', autoHide: false }"
            type="button"
            class="bars-card__hint"
            aria-label="Подсказка"
          >
            <i class="pi pi-question-circle" />
          </button>
        </div>
      </div>
      <Select
        :model-value="granularity"
        :options="granularityOptions"
        option-label="label"
        option-value="value"
        class="bars-card__select"
        append-to="body"
        @update:model-value="emit('update:granularity', $event as ExpenseGranularity)"
      />
    </div>

    <div
      v-if="loading"
      class="bars-card__loading"
      role="status"
      aria-live="polite"
    >
      <Skeleton
        width="100%"
        height="280px"
        border-radius="16px"
      />
    </div>

    <div
      v-else-if="error"
      class="bars-card__message"
    >
      <Message
        severity="error"
        icon="pi pi-exclamation-triangle"
        :closable="false"
      >
        <div class="bars-card__message-body">
          <p class="bars-card__message-title">
            Не удалось загрузить динамику расходов
          </p>
          <p class="bars-card__message-text">
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
      v-else-if="empty"
      class="bars-card__message"
    >
      <Message
        severity="info"
        icon="pi pi-inbox"
        :closable="false"
      >
        <div class="bars-card__message-body bars-card__message-body--compact">
          <p class="bars-card__message-title">
            Нет данных
          </p>
          <p class="bars-card__message-text">
            Добавьте операции, чтобы увидеть динамику расходов.
          </p>
        </div>
      </Message>
    </div>

    <div
      v-else
      class="bars-card__chart"
      role="img"
      aria-label="Столбчатая диаграмма расходов по дням"
    >
      <div class="bars-card__chart-container">
        <Chart
          v-if="styledChartData"
          type="bar"
          :data="styledChartData"
          :options="chartOptions"
          :plugins="isCapped ? [spikeLabelsPlugin] : []"
        />
      </div>
    </div>

    <div
      v-if="averageValue != null && !loading && !error && !empty"
      class="bars-card__legend"
    >
      <span class="bars-card__legend-item">
        <span class="bars-card__legend-dash" />
        Среднее: {{ formattedAverage }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.bars-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  height: 100%;
  padding: clamp(1rem, 2vw, 1.5rem);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-xl);
  box-shadow: var(--ft-shadow-sm);
}

.bars-card__head {
  display: flex;
  gap: var(--ft-space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.bars-card__title-row {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.bars-card__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.bars-card__hint {
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* Ensure minimum touch target size */
  min-width: var(--ft-control-height);
  min-height: var(--ft-control-height);
  padding: 0;

  font-size: 1rem;
  color: var(--ft-text-muted);

  background: none;
  border: none;

  transition: color var(--ft-transition-fast);
}

.bars-card__hint:hover {
  color: var(--ft-text-secondary);
}

.bars-card__hint:active {
  color: var(--ft-accent-primary);
}

.bars-card__loading {
  display: grid;
  place-items: center;
  min-height: 340px;
}

.bars-card__message {
  display: grid;
  align-content: start;
  min-height: 280px;
}

.bars-card__message-body {
  display: grid;
  gap: var(--ft-space-3);
}

.bars-card__message-body--compact {
  gap: var(--ft-space-2);
}

.bars-card__message-title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.bars-card__message-text {
  margin: 0;
}

.bars-card__chart {
  flex: 1;
  width: 100%;
  min-height: 280px;
  padding: var(--ft-space-2) 0;
}

.bars-card__chart-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 280px;
}

.bars-card__chart-container :deep(.p-chart) {
  width: 100%;
  height: 100%;
}

.bars-card__chart-container :deep(canvas) {
  height: 100%;
  max-height: 100%;
}

.bars-card__legend {
  display: flex;
  gap: var(--ft-space-4);
  padding-top: var(--ft-space-1);
}

.bars-card__legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  font-size: var(--ft-text-base);
  color: var(--ft-text-base);
}

.bars-card__legend-dash {
  display: inline-block;
  width: 20px;
  height: 0;
  border-top: 1.5px dashed var(--ft-text-muted);
}

@media (width >= 768px) {
  .bars-card__select {
    min-width: 180px;
    max-width: 220px;
  }
}

@media (width <= 640px) {
  .bars-card__head {
    flex-direction: column;
    align-items: stretch;
  }

  .bars-card__select {
    width: 100%;
  }

  .bars-card__chart {
    min-height: 220px;
  }

  .bars-card__chart-container {
    min-height: 220px;
  }
}
</style>
