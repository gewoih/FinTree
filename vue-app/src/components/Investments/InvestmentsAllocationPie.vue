<script setup lang="ts">
import { computed } from 'vue';
import type { Plugin } from 'chart.js';

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

const palette = [
  '#0ea5e9',
  '#22c55e',
  '#f97316',
  '#eab308',
  '#6366f1',
  '#14b8a6',
  '#ef4444',
  '#a855f7',
  '#84cc16',
  '#3b82f6',
];

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
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--ft-text-primary').trim() || '#1e293b';
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
        backgroundColor: segments.value.map((_, index) => palette[index % palette.length]),
        borderWidth: 2,
        borderColor: getComputedStyle(document.documentElement)
          .getPropertyValue('--ft-surface-base').trim() || '#0b111a',
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
      backgroundColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--ft-surface-raised').trim() || '#1e293b',
      titleColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--ft-text-primary').trim() || '#f1f5f9',
      bodyColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--ft-text-secondary').trim() || '#94a3b8',
      borderColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--ft-border-subtle').trim() || '#334155',
      borderWidth: 1,
      cornerRadius: 10,
      padding: 12,
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
    color: palette[index % palette.length],
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
        <p class="allocation-card__subtitle">
          Пропорции инвестиционного портфеля
        </p>
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
  border-radius: var(--ft-radius-2xl);
  border: 1px solid var(--ft-border-subtle);
  box-shadow: var(--ft-shadow-sm);
}

.allocation-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ft-space-4);
}

.allocation-card__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  cursor: help;
}

.allocation-card__subtitle {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-sm);
}

.allocation-card__loading {
  display: grid;
  place-items: center;
  gap: var(--ft-space-4);
  min-height: 280px;
}

.allocation-card__loading-legend {
  width: 100%;
  max-width: 240px;
  display: grid;
  gap: var(--ft-space-2);
}

.allocation-card__content {
  display: grid;
  gap: var(--ft-space-4);
  align-items: start;
}

.allocation-card__chart {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
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
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--ft-space-2);
}

.allocation-card__legend-item {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  padding: var(--ft-space-3);
  border-radius: var(--ft-radius-lg);
  border: 1px solid transparent;
  transition: background var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.allocation-card__legend-item:hover {
  background: color-mix(in srgb, var(--ft-surface-raised) 70%, transparent);
  border-color: var(--ft-border-subtle);
}

.allocation-card__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.allocation-card__meta {
  display: grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.allocation-card__name {
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
  font-size: var(--ft-text-base);
}

.allocation-card__value {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
  font-weight: var(--ft-font-semibold);
}

.allocation-card__percent {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  white-space: nowrap;
}

@media (min-width: 768px) {
  .allocation-card__content {
    grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
  }

  .allocation-card__legend {
    max-height: 320px;
    overflow: auto;
    padding-right: var(--ft-space-1);
  }
}

@media (max-width: 640px) {
  .allocation-card__chart :deep(.p-chart) {
    max-width: 220px;
  }
}
</style>
