<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import type { ChartData, ChartDataset, TooltipItem } from 'chart.js';
import type { ExpenseGranularity } from '../../types/analytics';

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

const textColor = ref('#1e293b');
const gridColor = ref('rgba(148,163,184,0.2)');
const accentColor = ref('#0ea5e9');
const surfaceBase = ref('#0b111a');

const updateColors = () => {
  if (typeof window === 'undefined') return;
  const styles = getComputedStyle(document.documentElement);
  textColor.value = styles.getPropertyValue('--ft-text-primary').trim() || '#1e293b';
  gridColor.value = styles.getPropertyValue('--ft-border-subtle').trim() || 'rgba(148,163,184,0.2)';
  accentColor.value = styles.getPropertyValue('--ft-info-400').trim() || '#0ea5e9';
  surfaceBase.value = styles.getPropertyValue('--ft-surface-raised').trim() || '#1e293b';
};

onMounted(() => {
  updateColors();
  const observer = new MutationObserver(updateColors);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

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
      borderColor: gridColor.value,
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
        color: textColor.value,
        font: { size: 12 },
      },
    },
    y: {
      grid: {
        color: gridColor.value,
      },
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
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: surfaceBase.value,
      titleColor: textColor.value,
      bodyColor: textColor.value,
      borderColor: gridColor.value,
      borderWidth: 1,
      cornerRadius: 10,
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
        <h3
          v-tooltip.top="'Как менялись расходы день за днём, по неделям или месяцам. Пунктирная линия — среднее значение.'"
          class="bars-card__title"
        >
          Динамика расходов
        </h3>
        <p class="bars-card__subtitle">
          Как менялись расходы по выбранной детализации
        </p>
      </div>
      <SelectButton
        :model-value="granularity"
        :options="granularityOptions"
        option-label="label"
        option-value="value"
        class="bars-card__toggle"
        @update:model-value="emit('update:granularity', $event)"
      />
    </div>

    <div
      v-if="loading"
      class="bars-card__loading"
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
  border-radius: var(--ft-radius-2xl);
  box-shadow: var(--ft-shadow-sm);
}

.bars-card__head {
  display: flex;
  gap: var(--ft-space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.bars-card__title {
  cursor: help;

  margin: 0;

  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.bars-card__subtitle {
  margin: var(--ft-space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
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
  width: 100%;
  height: 400px;
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

@media (width <= 640px) {
  .bars-card__head {
    flex-direction: column;
    align-items: stretch;
  }

  .bars-card__subtitle {
    font-size: var(--ft-text-xs);
  }

  .bars-card__toggle {
    width: 100%;
  }

  .bars-card__toggle :deep(.p-button) {
    flex: 1 1 0;
    min-width: 0;
  }

  .bars-card__toggle :deep(.p-button-label) {
    font-size: var(--ft-text-xs);
  }

  .bars-card__chart {
    height: 280px;
  }
}
</style>
