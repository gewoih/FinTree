<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, Plugin } from 'chart.js';
import UiButton from '../../ui/UiButton.vue';
import UiSelect from '../../ui/UiSelect.vue';
import UiSkeleton from '@/ui/UiSkeleton.vue';
import UiMessage from '@/ui/UiMessage.vue';
import UiChart from '@/ui/UiChart.vue';
import type { CategoryLegendItem, CategoryScope } from '../../types/analytics';
import { useChartColors } from '../../composables/useChartColors';

const props = defineProps<{
  loading: boolean;
  error: string | null;
  chartData: ChartData<'pie', number[], string> | null;
  legend: CategoryLegendItem[];
  currency: string;
  scope: CategoryScope;
  scopeOptions: Array<{ label: string; value: CategoryScope }>;
}>();

const emit = defineEmits<{
  (event: 'retry'): void;
  (event: 'select-category', value: CategoryLegendItem): void;
  (event: 'update:scope', value: CategoryScope): void;
}>();

const { colors, tooltipConfig } = useChartColors();

const handleCategoryClick = (item: CategoryLegendItem) => {
  emit('select-category', item);
};

const showEmpty = computed(
  () => !props.loading && !props.error && (!props.chartData || props.legend.length === 0)
);

const totalAmount = computed(() => {
  return props.legend.reduce((sum, item) => sum + item.amount, 0);
});

const formattedTotal = computed(() => {
  if (totalAmount.value <= 0) return '—';
  return totalAmount.value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    maximumFractionDigits: 0,
  });
});

const centerTextPlugin = computed<Plugin<'doughnut'>>(() => ({
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, width, height } = chart;
    if (!ctx) return;
    ctx.save();

    const text = formattedTotal.value;
    const fontSize = Math.min(width, height) * 0.08;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = colors.tooltipText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);

    ctx.restore();
  },
}));

const donutChartData = computed(() => {
  if (!props.chartData) return null;
  return {
    ...props.chartData,
    datasets: props.chartData.datasets.map(ds => ({
      ...ds,
      borderWidth: 2,
      borderColor: colors.surface,
      hoverBorderWidth: 3,
      hoverOffset: 8,
    })),
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 1,
  cutout: '65%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      ...tooltipConfig(),
      callbacks: {
        label(context: { parsed: number; label: string }) {
          const formatted = context.parsed.toLocaleString('ru-RU', {
            style: 'currency',
            currency: props.currency,
            maximumFractionDigits: 0,
          });
          return `${context.label}: ${formatted}`;
        },
      },
    },
  },
}));
</script>

<template>
  <div class="donut-card">
    <div class="donut-card__head">
      <div>
        <div class="donut-card__title-row">
          <h3 class="donut-card__title">
            Расходы по категориям
          </h3>
          <i
            v-tooltip.top="'Показывает, на что уходят деньги. Кликните на категорию, чтобы увидеть транзакции.'"
            class="pi pi-question-circle donut-card__hint"
          />
        </div>
      </div>
      <UiSelect
        :model-value="scope"
        :options="scopeOptions"
        option-label="label"
        option-value="value"
        class="donut-card__scope-select"
        @update:model-value="emit('update:scope', $event as CategoryScope)"
      />
    </div>

    <div
      v-if="loading"
      class="donut-card__loading"
    >
      <UiSkeleton
        width="220px"
        height="220px"
        border-radius="999px"
      />
      <div class="donut-card__loading-legend">
        <UiSkeleton
          v-for="i in 4"
          :key="i"
          height="18px"
          width="70%"
        />
      </div>
    </div>

    <div
      v-else-if="error"
      class="donut-card__message"
    >
      <UiMessage
        severity="error"
        icon="pi pi-exclamation-triangle"
        :closable="false"
      >
        <div class="donut-card__message-body">
          <p class="donut-card__message-title">
            Не удалось загрузить структуру расходов
          </p>
          <p class="donut-card__message-text">
            {{ error }}
          </p>
          <UiButton
            label="Попробовать снова"
            icon="pi pi-refresh"
            size="sm"
            @click="emit('retry')"
          />
        </div>
      </UiMessage>
    </div>

    <div
      v-else-if="showEmpty"
      class="donut-card__message"
    >
      <UiMessage
        severity="info"
        icon="pi pi-inbox"
        :closable="false"
      >
        <div class="donut-card__message-body donut-card__message-body--compact">
          <p class="donut-card__message-title">
            Нет данных за период
          </p>
          <p class="donut-card__message-text">
            Добавьте расходы, чтобы увидеть распределение.
          </p>
        </div>
      </UiMessage>
    </div>

    <div
      v-else
      class="donut-card__content"
    >
      <div
        class="donut-card__chart"
        role="img"
        aria-label="Круговая диаграмма расходов по категориям"
      >
        <UiChart
          v-if="donutChartData"
          type="doughnut"
          :data="donutChartData"
          :options="chartOptions"
          :plugins="[centerTextPlugin]"
        />
      </div>
      <ul class="donut-card__legend">
        <li
          v-for="item in legend"
          :key="item.id"
          class="donut-card__legend-item"
          role="button"
          tabindex="0"
          :aria-label="`${item.name}, ${item.amount.toLocaleString('ru-RU', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
          })}, ${item.percent.toFixed(1)}%`"
          @click="handleCategoryClick(item)"
          @keydown.enter.prevent="handleCategoryClick(item)"
          @keydown.space.prevent="handleCategoryClick(item)"
        >
          <span
            class="donut-card__legend-color"
            :style="{ backgroundColor: item.color }"
          />
          <div class="donut-card__legend-body">
            <span class="donut-card__legend-name">{{ item.name }}</span>
            <span class="donut-card__legend-amount">
              {{
                item.amount.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency,
                  maximumFractionDigits: 0,
                })
              }}
            </span>
          </div>
          <span class="donut-card__legend-percent">{{ item.percent.toFixed(1) }}%</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.donut-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  padding: clamp(1rem, 2vw, 1.5rem);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-xl);
  box-shadow: var(--ft-shadow-sm);
}

.donut-card__head {
  display: flex;
  gap: var(--ft-space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.donut-card__title-row {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.donut-card__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.donut-card__hint {
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* Ensure minimum touch target size */
  min-width: var(--ft-control-height);
  min-height: var(--ft-control-height);

  font-size: 1rem;
  color: var(--ft-text-muted);

  transition: color var(--ft-transition-fast);
}

.donut-card__hint:hover {
  color: var(--ft-text-secondary);
}

.donut-card__hint:active {
  color: var(--ft-accent-primary);
}

.donut-card__loading {
  display: grid;
  gap: var(--ft-space-4);
  place-items: center;
  min-height: 280px;
}

.donut-card__loading-legend {
  display: grid;
  gap: var(--ft-space-2);
  width: 100%;
  max-width: 240px;
}

.donut-card__message {
  display: grid;
}

.donut-card__message-body {
  display: grid;
  gap: var(--ft-space-3);
}

.donut-card__message-body--compact {
  gap: var(--ft-space-2);
}

.donut-card__message-title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.donut-card__message-text {
  margin: 0;
}

.donut-card__content {
  display: grid;
  gap: var(--ft-space-4);
  align-items: start;
}

.donut-card__chart {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 100%;
  padding: var(--ft-space-2);
}

.donut-card__chart :deep(.p-chart) {
  width: 100%;
  max-width: 280px;
}

.donut-card__chart :deep(canvas) {
  width: 100% !important;
  height: auto !important;
}

.donut-card__legend {
  display: grid;
  gap: var(--ft-space-2);

  margin: 0;
  padding: 0;

  list-style: none;
}

.donut-card__legend-item {
  cursor: pointer;

  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  padding: var(--ft-space-3);

  border: 1px solid transparent;
  border-radius: var(--ft-radius-lg);

  transition: background var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.donut-card__legend-item:hover {
  background: color-mix(in srgb, var(--ft-surface-raised) 70%, transparent);
  border-color: var(--ft-border-subtle);
}

.donut-card__legend-item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500) 65%, transparent);
  outline-offset: 2px;
}

.donut-card__legend-color {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border-radius: var(--ft-radius-full);
}

.donut-card__legend-body {
  display: grid;
  flex: 1;
  gap: 1px;
  min-width: 0;
}

.donut-card__legend-name {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
}

.donut-card__legend-amount {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-secondary);
}

.donut-card__legend-percent {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  white-space: nowrap;
}

@media (width >= 768px) {
  .donut-card__scope-select {
    min-width: 180px;
    max-width: 220px;
  }

  .donut-card__content {
    grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
  }

  .donut-card__legend {
    overflow: auto;
    max-height: 320px;
    padding-right: var(--ft-space-1);
  }
}

@media (width <= 640px) {
  .donut-card__head {
    flex-direction: column;
    align-items: stretch;
  }

  .donut-card__scope-select {
    width: 100%;
  }

  .donut-card__chart :deep(.p-chart) {
    max-width: 220px;
  }
}
</style>
