<script setup lang="ts">
import { computed } from 'vue';
import type { CategoryLegendItem } from '../../types/analytics';

const props = defineProps<{
  loading: boolean;
  error: string | null;
  period: number;
  periodOptions: ReadonlyArray<{ label: string; value: number }>;
  chartData: any | null;
  legend: CategoryLegendItem[];
  currency: string;
}>();

const emit = defineEmits<{
  (event: 'update:period', value: number): void;
  (event: 'retry'): void;
}>();

const handlePeriodUpdate = (value: number) => {
  // Only emit valid positive numbers
  if (value && typeof value === 'number' && value > 0) {
    emit('update:period', value);
  }
};

const showEmpty = computed(
  () => !props.loading && !props.error && (!props.chartData || props.legend.length === 0)
);

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 1,
  plugins: {
    legend: {
      display: false,
    },
  },
}));
</script>

<template>
  <Card class="analytics-card">
    <template #title>
      <div class="card-head">
        <div>
          <h3>Расходы по категориям</h3>
          <p>Распределение трат за выбранный период</p>
        </div>
        <SelectButton
          :modelValue="period"
          :options="periodOptions"
          optionLabel="label"
          optionValue="value"
          @update:modelValue="handlePeriodUpdate"
        />
      </div>
    </template>

    <template #content>
      <div v-if="loading" class="card-loading">
        <Skeleton width="240px" height="240px" borderRadius="999px" />
        <div class="card-loading__legend">
          <Skeleton v-for="index in 4" :key="index" height="18px" width="70%" />
        </div>
      </div>

      <div v-else-if="error" class="card-message">
        <Message severity="error" icon="pi pi-exclamation-triangle" :closable="false">
          <div class="card-message__body">
            <p class="card-message__title">Не удалось загрузить структуру расходов</p>
            <p class="card-message__text">{{ error }}</p>
            <Button
              label="Попробовать снова"
              icon="pi pi-refresh"
              size="small"
              @click="emit('retry')"
            />
          </div>
        </Message>
      </div>

      <div v-else-if="showEmpty" class="card-message">
        <Message severity="info" icon="pi pi-inbox" :closable="false">
          <div class="card-message__body card-message__body--compact">
            <p class="card-message__title">Нет данных за период</p>
            <p class="card-message__text">Добавьте расходы, чтобы увидеть распределение.</p>
          </div>
        </Message>
      </div>

      <div v-else class="pie-card__content">
        <div class="pie-card__chart">
          <Chart
            v-if="chartData"
            type="pie"
            :data="chartData"
            :options="chartOptions"
          />
        </div>
        <ul class="pie-card__legend">
          <li v-for="item in legend" :key="item.id">
            <span class="pie-card__legend-color" :style="{ backgroundColor: item.color }" />
            <div class="pie-card__legend-body">
              <span class="pie-card__legend-name">{{ item.name }}</span>
              <span class="pie-card__legend-amount">
                {{
                  item.amount.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency,
                    minimumFractionDigits: 2,
                  })
                }}
              </span>
            </div>
            <Tag severity="secondary">
              {{ item.percent.toFixed(1) }}%
            </Tag>
          </li>
        </ul>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.analytics-card {
  background: var(--ft-surface-base);
  border-radius: var(--ft-radius-2xl);
  border: 1px solid var(--ft-border-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  padding-bottom: var(--ft-space-3);
  box-shadow: var(--ft-shadow-sm);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ft-space-4);
}

.card-head h3 {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.card-head p {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-secondary);
}

.card-loading {
  display: grid;
  place-items: center;
  gap: var(--ft-space-4);
  min-height: 320px;
}

.card-loading__legend {
  width: 100%;
  max-width: 260px;
  display: grid;
  gap: var(--ft-space-2);
}

.card-message {
  display: grid;
}

.card-message__body {
  display: grid;
  gap: var(--ft-space-3);
}

.card-message__body--compact {
  gap: var(--ft-space-2);
}

.card-message__title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.card-message__text {
  margin: 0;
}

.pie-card__content {
  display: grid;
  gap: clamp(1.25rem, 2vw, 2rem);
  align-items: center;
}

.pie-card__chart {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ft-space-4);
}

.pie-card__chart :deep(.p-chart) {
  width: 100%;
  max-width: 420px;
}

.pie-card__chart :deep(canvas) {
  width: 100% !important;
  height: auto !important;
}

.pie-card__legend {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--ft-space-2);
}

.pie-card__legend li {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  padding: var(--ft-space-3);
  border-radius: var(--ft-radius-xl);
  background: color-mix(in srgb, var(--ft-surface-raised) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--ft-border-subtle) 60%, transparent);
  box-shadow: var(--ft-shadow-xs);
}

.pie-card__legend-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pie-card__legend-body {
  display: grid;
  gap: var(--ft-space-1);
  flex: 1;
}

.pie-card__legend-name {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.pie-card__legend-amount {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

@media (min-width: 992px) {
  .pie-card__content {
    grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);
  }

  .pie-card__legend {
    max-height: 360px;
    overflow: auto;
    padding-right: var(--ft-space-1);
  }
}
</style>
