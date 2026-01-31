<script setup lang="ts">
import { computed } from 'vue';
import type { CategoryLegendItem } from '../../types/analytics';

const props = defineProps<{
  loading: boolean;
  error: string | null;
  period: number;
  periodOptions: Array<{ label: string; value: number }>;
  monthLabel: string;
  canNavigateNext: boolean;
  chartData: any | null;
  legend: CategoryLegendItem[];
  currency: string;
}>();

const emit = defineEmits<{
  (event: 'update:period', value: number): void;
  (event: 'navigate-prev'): void;
  (event: 'navigate-next'): void;
  (event: 'retry'): void;
  (event: 'select-category', value: CategoryLegendItem): void;
}>();

const handlePeriodUpdate = (value: number) => {
  // Only emit valid positive numbers
  if (value && typeof value === 'number' && value > 0) {
    emit('update:period', value);
  }
};

const handleCategoryClick = (item: CategoryLegendItem) => {
  emit('select-category', item);
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
        <div class="card-controls">
          <div class="month-nav">
            <button
              type="button"
              class="month-nav__button"
              aria-label="Предыдущий месяц"
              @click="emit('navigate-prev')"
            >
              <i class="pi pi-chevron-left" />
            </button>
            <span class="month-nav__label">{{ monthLabel }}</span>
            <button
              type="button"
              class="month-nav__button"
              aria-label="Следующий месяц"
              :disabled="!canNavigateNext"
              @click="emit('navigate-next')"
            >
              <i class="pi pi-chevron-right" />
            </button>
          </div>
          <div
            class="period-toggle"
            role="radiogroup"
            aria-label="Период"
          >
            <button
              v-for="option in periodOptions"
              :key="option.value"
              type="button"
              class="period-toggle__button"
              :class="{ 'period-toggle__button--active': option.value === period }"
              :aria-pressed="option.value === period"
              @click="handlePeriodUpdate(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <template #content>
      <div
        v-if="loading"
        class="card-loading"
      >
        <Skeleton
          width="240px"
          height="240px"
          border-radius="999px"
        />
        <div class="card-loading__legend">
          <Skeleton
            v-for="index in 4"
            :key="index"
            height="18px"
            width="70%"
          />
        </div>
      </div>

      <div
        v-else-if="error"
        class="card-message"
      >
        <Message
          severity="error"
          icon="pi pi-exclamation-triangle"
          :closable="false"
        >
          <div class="card-message__body">
            <p class="card-message__title">
              Не удалось загрузить структуру расходов
            </p>
            <p class="card-message__text">
              {{ error }}
            </p>
            <Button
              label="Попробовать снова"
              icon="pi pi-refresh"
              size="small"
              @click="emit('retry')"
            />
          </div>
        </Message>
      </div>

      <div
        v-else-if="showEmpty"
        class="card-message"
      >
        <Message
          severity="info"
          icon="pi pi-inbox"
          :closable="false"
        >
          <div class="card-message__body card-message__body--compact">
            <p class="card-message__title">
              Нет данных за период
            </p>
            <p class="card-message__text">
              Добавьте расходы, чтобы увидеть распределение.
            </p>
          </div>
        </Message>
      </div>

      <div
        v-else
        class="pie-card__content"
      >
        <div class="pie-card__chart">
          <Chart
            v-if="chartData"
            type="pie"
            :data="chartData"
            :options="chartOptions"
          />
        </div>
        <ul class="pie-card__legend">
          <li
            v-for="item in legend"
            :key="item.id"
            class="pie-card__legend-item"
            role="button"
            tabindex="0"
            @click="handleCategoryClick(item)"
            @keydown.enter.prevent="handleCategoryClick(item)"
            @keydown.space.prevent="handleCategoryClick(item)"
          >
            <span
              class="pie-card__legend-color"
              :style="{ backgroundColor: item.color }"
            />
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

.card-controls {
  display: grid;
  justify-items: end;
  gap: var(--ft-space-2);
}

.month-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ft-border-subtle) 70%, transparent);
  background: color-mix(in srgb, var(--ft-surface-raised) 85%, transparent);
}

.month-nav__label {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  min-width: 120px;
  text-align: center;
}

.month-nav__button {
  border: none;
  background: transparent;
  color: var(--ft-text-secondary);
  font-size: 0.85rem;
  padding: 0.2rem;
  border-radius: 999px;
  cursor: pointer;
  transition: color var(--ft-transition-fast), background-color var(--ft-transition-fast);
}

.month-nav__button:hover:not(:disabled) {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-surface-base) 70%, transparent);
}

.month-nav__button:disabled {
  opacity: 0.4;
  cursor: default;
}

.period-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.2rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ft-surface-raised) 85%, transparent);
  border: 1px solid color-mix(in srgb, var(--ft-border-subtle) 70%, transparent);
}

.period-toggle__button {
  border: none;
  background: transparent;
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color var(--ft-transition-fast), color var(--ft-transition-fast);
}

.period-toggle__button--active {
  background: var(--ft-surface-base);
  color: var(--ft-text-primary);
  box-shadow: var(--ft-shadow-xs);
}

.period-toggle__button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500, #3b82f6) 65%, transparent);
  outline-offset: 2px;
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

.pie-card__legend-item {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  padding: var(--ft-space-3);
  border-radius: var(--ft-radius-xl);
  background: color-mix(in srgb, var(--ft-surface-raised) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--ft-border-subtle) 60%, transparent);
  box-shadow: var(--ft-shadow-xs);
  cursor: pointer;
  transition: transform var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.pie-card__legend-item:hover {
  border-color: color-mix(in srgb, var(--ft-border-strong, #94a3b8) 45%, transparent);
  transform: translateY(-1px);
}

.pie-card__legend-item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500, #3b82f6) 65%, transparent);
  outline-offset: 2px;
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
