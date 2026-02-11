<script setup lang="ts">
import { computed } from 'vue';

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

const chartData = computed(() => {
  if (segments.value.length === 0) return null;

  return {
    labels: segments.value.map(item => item.name),
    datasets: [
      {
        data: segments.value.map(item => item.value),
        backgroundColor: segments.value.map((_, index) => palette[index % palette.length]),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 1,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context: { parsed?: number; label?: string }) => {
          const value = Number(context.parsed ?? 0);
          const share = totalValue.value > 0 ? (value / totalValue.value) * 100 : 0;
          const amount = new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: props.baseCurrencyCode,
            minimumFractionDigits: 2,
          }).format(value);
          return `${context.label ?? 'Счет'}: ${amount} (${share.toFixed(1)}%)`;
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
    minimumFractionDigits: 2,
  }).format(value);
</script>

<template>
  <UiCard
    class="allocation-card"
    variant="muted"
    padding="lg"
  >
    <div class="allocation-card__head">
      <div>
        <h3>Распределение по счетам</h3>
        <p>Пропорции инвестиционного портфеля в базовой валюте</p>
      </div>
    </div>

    <div
      v-if="loading"
      class="allocation-card__loading"
    >
      <UiSkeleton
        width="220px"
        height="220px"
        border-radius="999px"
      />
      <div class="allocation-card__loading-list">
        <UiSkeleton
          v-for="index in 4"
          :key="index"
          height="20px"
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
          v-if="chartData"
          type="pie"
          :data="chartData"
          :options="chartOptions"
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
          <Tag severity="secondary">
            {{ item.share.toFixed(1) }}%
          </Tag>
        </li>
      </ul>
    </div>
  </UiCard>
</template>

<style scoped>
.allocation-card {
  display: grid;
  gap: var(--space-4);
}

.allocation-card__head h3 {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--text);
}

.allocation-card__head p {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: var(--ft-text-sm);
}

.allocation-card__loading {
  display: grid;
  justify-items: center;
  gap: var(--space-4);
}

.allocation-card__loading-list {
  width: min(100%, 340px);
  display: grid;
  gap: var(--space-2);
}

.allocation-card__content {
  display: grid;
  gap: var(--space-4);
}

.allocation-card__chart {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-2);
}

.allocation-card__chart :deep(.p-chart) {
  width: min(100%, 360px);
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
  gap: var(--space-2);
}

.allocation-card__legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--ft-radius-xl);
  border: 1px solid var(--ft-border-subtle);
  background: color-mix(in srgb, var(--ft-surface-raised) 84%, transparent);
}

.allocation-card__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.allocation-card__meta {
  display: grid;
  gap: 2px;
  flex: 1;
}

.allocation-card__name {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.allocation-card__value {
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-sm);
}

@media (min-width: 992px) {
  .allocation-card__content {
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
    align-items: center;
  }
}
</style>
