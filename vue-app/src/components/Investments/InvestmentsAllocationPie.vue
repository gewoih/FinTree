<script setup lang="ts">
import { computed } from 'vue';
import type { Plugin } from 'chart.js';
import Skeleton from 'primevue/skeleton';
import Message from 'primevue/message';
import Chart from 'primevue/chart';
import { useChartColors } from '@/composables/useChartColors';

interface AllocationAccount {
  id: string;
  name: string;
  balanceInBaseCurrency: number;
}

const props = defineProps<{
  accounts: AllocationAccount[];
  baseCurrencyCode: string;
  loading: boolean;
}>();

const { colors, tooltipConfig } = useChartColors();

const segments = computed(() =>
  props.accounts
    .map(account => ({
      ...account,
      value: Math.max(0, Number(account.balanceInBaseCurrency ?? 0)),
    }))
    .filter(account => account.value > 0)
    .sort((a, b) => b.value - a.value)
);

const totalValue = computed(() =>
  segments.value.reduce((sum, segment) => sum + segment.value, 0)
);

const formattedTotal = computed(() => {
  if (totalValue.value <= 0) return '\u2014';
  return totalValue.value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.baseCurrencyCode,
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
  if (segments.value.length === 0) return null;

  return {
    labels: segments.value.map(item => item.name),
    datasets: [
      {
        data: segments.value.map(item => item.value),
        backgroundColor: segments.value.map((_, index) => colors.palette[index % colors.palette.length]),
        borderWidth: 2,
        borderColor: colors.surface,
        hoverBorderWidth: 3,
        hoverOffset: 8,
      },
    ],
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
          const value = Number(context.parsed ?? 0);
          const share = totalValue.value > 0 ? (value / totalValue.value) * 100 : 0;
          const amount = new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: props.baseCurrencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value);
          return `${context.label ?? '\u0421\u0447\u0435\u0442'}: ${amount} (${share.toFixed(1)}%)`;
        },
      },
    },
  },
}));

const formattedLegend = computed(() =>
  segments.value.map((item, index) => ({
    id: item.id,
    name: item.name,
    color: colors.palette[index % colors.palette.length],
    value: item.value,
    share: totalValue.value > 0 ? (item.value / totalValue.value) * 100 : 0,
  }))
);

const formatMoney = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: props.baseCurrencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
</script>

<template>
  <div class="allocation-card">
    <div class="allocation-card__head">
      <div>
        <h3
          v-tooltip.top="'Показывает распределение портфеля по счетам в базовой валюте'"
          class="allocation-card__title"
        >
          Распределение по счетам
        </h3>
      </div>
    </div>

    <div
      v-if="loading"
      class="allocation-card__loading"
    >
      <Skeleton
        width="220px"
        height="220px"
        border-radius="999px"
      />
      <div class="allocation-card__loading-legend">
        <Skeleton
          v-for="i in 4"
          :key="i"
          height="18px"
          width="70%"
        />
      </div>
    </div>

    <Message
      v-else-if="segments.length === 0"
      severity="info"
      icon="pi pi-inbox"
      :closable="false"
    >
      Добавьте инвестиционные счета и операции, чтобы увидеть структуру портфеля.
    </Message>

    <div
      v-else
      class="allocation-card__content"
    >
      <div class="allocation-card__chart">
        <Chart
          v-if="donutChartData"
          type="doughnut"
          :data="donutChartData"
          :options="chartOptions"
          :plugins="[centerTextPlugin]"
        />
      </div>

      <ul class="allocation-card__legend">
        <li
          v-for="item in formattedLegend"
          :key="item.id"
          class="allocation-card__legend-item"
        >
          <span
            class="allocation-card__dot"
            :style="{ backgroundColor: item.color }"
          />
          <div class="allocation-card__meta">
            <span class="allocation-card__name">{{ item.name }}</span>
            <span class="allocation-card__value">{{ formatMoney(item.value) }}</span>
          </div>
          <span class="allocation-card__percent">{{ item.share.toFixed(1) }}%</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.allocation-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  padding: clamp(1rem, 2vw, 1.5rem);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-xl);
  box-shadow: var(--ft-shadow-sm);
}

.allocation-card__head {
  display: flex;
  gap: var(--ft-space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.allocation-card__title {
  cursor: help;

  margin: 0;

  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.allocation-card__loading {
  display: grid;
  gap: var(--ft-space-4);
  place-items: center;
  min-height: 280px;
}

.allocation-card__loading-legend {
  display: grid;
  gap: var(--ft-space-2);
  width: 100%;
  max-width: 240px;
}

.allocation-card__content {
  display: grid;
  gap: var(--ft-space-4);
  align-items: start;
}

.allocation-card__chart {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 100%;
  padding: var(--ft-space-2);
}

.allocation-card__chart :deep(.p-chart) {
  width: 100%;
  max-width: 280px;
}

.allocation-card__chart :deep(canvas) {
  width: 100% !important;
  height: auto !important;
}

.allocation-card__legend {
  display: grid;
  gap: var(--ft-space-2);

  margin: 0;
  padding: 0;

  list-style: none;
}

.allocation-card__legend-item {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  padding: var(--ft-space-3);

  border: 1px solid transparent;
  border-radius: var(--ft-radius-lg);

  transition: background var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.allocation-card__legend-item:hover {
  background: color-mix(in srgb, var(--ft-surface-raised) 70%, transparent);
  border-color: var(--ft-border-subtle);
}

.allocation-card__dot {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border-radius: var(--ft-radius-full);
}

.allocation-card__meta {
  display: grid;
  flex: 1;
  gap: 1px;
  min-width: 0;
}

.allocation-card__name {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
}

.allocation-card__value {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
}

.allocation-card__percent {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  white-space: nowrap;
}

@media (width >= 768px) {
  .allocation-card__content {
    grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
  }

  .allocation-card__legend {
    overflow: auto;
    max-height: 320px;
    padding-right: var(--ft-space-1);
  }
}

@media (width <= 640px) {
  .allocation-card__chart :deep(.p-chart) {
    max-width: 220px;
  }
}
</style>
