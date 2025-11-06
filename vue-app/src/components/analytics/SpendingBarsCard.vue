<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import type { ExpenseGranularity } from '../../types/analytics';

const props = defineProps<{
  loading: boolean;
  error: string | null;
  granularity: ExpenseGranularity;
  granularityOptions: ReadonlyArray<{ label: string; value: ExpenseGranularity }>;
  chartData: any | null;
  empty: boolean;
  currency: string;
}>();

const emit = defineEmits<{
  (event: 'update:granularity', value: ExpenseGranularity): void;
  (event: 'retry'): void;
}>();

const textColor = ref('#1e293b');
const gridColor = ref('rgba(148,163,184,0.2)');

const updateColors = () => {
  if (typeof window === 'undefined') return;
  const styles = getComputedStyle(document.documentElement);
  textColor.value = styles.getPropertyValue('--ft-text-primary').trim() || '#1e293b';
  gridColor.value = styles.getPropertyValue('--ft-border-subtle').trim() || 'rgba(148,163,184,0.2)';
};

onMounted(() => {
  updateColors();
  const observer = new MutationObserver(updateColors);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
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
      },
    },
    y: {
      grid: {
        color: gridColor.value,
      },
      ticks: {
        color: textColor.value,
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
      callbacks: {
        label(context: any) {
          const value = context.parsed.y ?? 0;
          const formatted = value.toLocaleString('ru-RU', {
            style: 'currency',
            currency: props.currency,
            minimumFractionDigits: 0,
          });
          return `Расходы: ${formatted}`;
        },
      },
    },
  },
}));
</script>

<template>
  <Card class="analytics-card">
    <template #title>
      <div class="card-head">
        <div>
          <h3>Динамика расходов</h3>
          <p>Интенсивность трат по выбранной детализации</p>
        </div>
        <SelectButton
          :modelValue="granularity"
          :options="granularityOptions"
          optionLabel="label"
          optionValue="value"
          @update:modelValue="emit('update:granularity', $event)"
        />
      </div>
    </template>

    <template #content>
      <div v-if="loading" class="card-loading">
        <Skeleton width="100%" height="280px" borderRadius="16px" />
      </div>

      <div v-else-if="error" class="card-message">
        <Message severity="error" icon="pi pi-exclamation-triangle" :closable="false">
          <div class="card-message__body">
            <p class="card-message__title">Не удалось загрузить динамику расходов</p>
            <p class="card-message__text">{{ error }}</p>
            <Button
              label="Повторить"
              icon="pi pi-refresh"
              size="small"
              @click="emit('retry')"
            />
          </div>
        </Message>
      </div>

      <div v-else-if="empty" class="card-message">
        <Message severity="info" icon="pi pi-inbox" :closable="false">
          <div class="card-message__body card-message__body--compact">
            <p class="card-message__title">Нет данных</p>
            <p class="card-message__text">Добавьте операции, чтобы увидеть динамику расходов.</p>
          </div>
        </Message>
      </div>

      <div v-else class="bars-card__chart">
        <div class="bars-card__chart-container">
          <Chart
            v-if="chartData"
            type="bar"
            :data="chartData"
            :options="chartOptions"
          />
        </div>
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
  min-height: 340px;
  display: grid;
  place-items: center;
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

.bars-card__chart {
  height: 450px;
  width: 100%;
  padding: var(--ft-space-4) var(--ft-space-3);
}

.bars-card__chart-container {
  position: relative;
  height: 100%;
  width: 100%;
}

.bars-card__chart-container :deep(.p-chart) {
  height: 100%;
  width: 100%;
}

.bars-card__chart-container :deep(canvas) {
  max-height: 100%;
  height: 100%;
}
</style>
