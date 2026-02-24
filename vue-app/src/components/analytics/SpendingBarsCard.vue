<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, ChartDataset, TooltipItem } from 'chart.js';
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

const styledChartData = computed(() => {
  if (!props.chartData) return null;
  const datasets = [...props.chartData.datasets] as ChartDataset<'bar' | 'line', number[]>[];

  if (averageValue.value != null) {
    const len = props.chartData.labels?.length ?? 0;
    const averageDataset: ChartDataset<'line', number[]> = {
      label: 'Среднее',
      data: Array(len).fill(averageValue.value),
      type: 'line' as const,
      borderColor: colors.grid,
      borderDash: [6, 4],
      borderWidth: 1.5,
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
            v-tooltip="{ value: 'Как менялись расходы день за днём, по неделям или месяцам. Пунктирная линия — среднее значение.', event: 'click' }"
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
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.bars-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

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
  aspect-ratio: 16 / 9;
  width: 100%;
  max-height: 400px;
  padding: var(--ft-space-2) 0;
}

.bars-card__chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.bars-card__chart-container :deep(.p-chart) {
  width: 100%;
  height: 100%;
}

.bars-card__chart-container :deep(canvas) {
  height: 100%;
  max-height: 100%;
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
    aspect-ratio: 4 / 3;
    max-height: 280px;
  }
}
</style>
