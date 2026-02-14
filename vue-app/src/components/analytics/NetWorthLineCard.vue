<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { ChartData, TooltipItem } from 'chart.js';

const props = withDefaults(
  defineProps<{
    loading: boolean;
    error: string | null;
    chartData: ChartData<'line' | 'bar', number[], string> | null;
    currency: string;
    chartType?: 'line' | 'bar';
  }>(),
  { chartType: 'line' },
);

const emit = defineEmits<{
  (event: 'retry'): void;
}>();

const textColor = ref('#1e293b');
const gridColor = ref('rgba(148,163,184,0.2)');
const tooltipBg = ref('#1e293b');
const tooltipTitle = ref('#f1f5f9');
const tooltipBody = ref('#94a3b8');
const tooltipBorder = ref('#334155');

const updateColors = () => {
  if (typeof window === 'undefined') return;
  const styles = getComputedStyle(document.documentElement);
  textColor.value = styles.getPropertyValue('--ft-text-primary').trim() || '#1e293b';
  gridColor.value = styles.getPropertyValue('--ft-border-subtle').trim() || 'rgba(148,163,184,0.2)';
  tooltipBg.value = styles.getPropertyValue('--ft-surface-raised').trim() || '#1e293b';
  tooltipTitle.value = styles.getPropertyValue('--ft-text-primary').trim() || '#f1f5f9';
  tooltipBody.value = styles.getPropertyValue('--ft-text-secondary').trim() || '#94a3b8';
  tooltipBorder.value = styles.getPropertyValue('--ft-border-subtle').trim() || '#334155';
};

onMounted(() => {
  updateColors();
  const observer = new MutationObserver(updateColors);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

const showEmpty = computed(() => !props.loading && !props.error && !props.chartData);

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
      backgroundColor: tooltipBg.value,
      titleColor: tooltipTitle.value,
      bodyColor: tooltipBody.value,
      borderColor: tooltipBorder.value,
      borderWidth: 1,
      cornerRadius: 10,
      padding: 12,
      callbacks: {
        label(context: TooltipItem<'line' | 'bar'>) {
          const value = context.parsed.y ?? 0;
          const formatted = value.toLocaleString('ru-RU', {
            style: 'currency',
            currency: props.currency,
            maximumFractionDigits: 0,
          });
          return `Net Worth: ${formatted}`;
        },
      },
    },
  },
}));
</script>

<template>
  <div class="networth-card">
    <div class="networth-card__head">
      <div>
        <h3>Изменение капитала</h3>
        <p>Net Worth за последние 12 месяцев</p>
      </div>
    </div>

    <div
      v-if="loading"
      class="networth-card__loading"
    >
      <Skeleton
        width="100%"
        height="280px"
        border-radius="16px"
      />
    </div>

    <div
      v-else-if="error"
      class="networth-card__message"
    >
      <Message
        severity="error"
        icon="pi pi-exclamation-triangle"
        :closable="false"
      >
        <div class="networth-card__message-body">
          <p class="networth-card__message-title">
            Не удалось загрузить Net Worth
          </p>
          <p class="networth-card__message-text">
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
      v-else-if="showEmpty"
      class="networth-card__message"
    >
      <Message
        severity="info"
        icon="pi pi-inbox"
        :closable="false"
      >
        <div class="networth-card__message-body networth-card__message-body--compact">
          <p class="networth-card__message-title">
            Нет данных
          </p>
          <p class="networth-card__message-text">
            Добавьте операции, чтобы увидеть динамику капитала.
          </p>
        </div>
      </Message>
    </div>

    <div
      v-else
      class="networth-card__chart"
      role="img"
      aria-label="График динамики капитала"
    >
      <div class="networth-card__chart-container">
        <Chart
          v-if="chartData"
          :type="props.chartType"
          :data="chartData"
          :options="chartOptions"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.networth-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  padding: clamp(1rem, 2vw, 1.5rem);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-2xl);
  box-shadow: var(--ft-shadow-sm);
}

.networth-card__head {
  display: flex;
  gap: var(--ft-space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.networth-card__head h3 {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.networth-card__head p {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-secondary);
}

.networth-card__loading {
  display: grid;
  gap: var(--ft-space-3);
}

.networth-card__message {
  display: grid;
}

.networth-card__message-body {
  display: grid;
  gap: var(--ft-space-2);
}

.networth-card__message-body--compact {
  gap: var(--ft-space-1);
}

.networth-card__message-title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.networth-card__message-text {
  margin: 0;
  color: var(--ft-text-secondary);
}

.networth-card__chart {
  padding: var(--ft-space-2) 0 var(--ft-space-1);
}

.networth-card__chart-container {
  position: relative;
  width: 100%;
  height: 350px;
}

@media (width <= 640px) {
  .networth-card__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .networth-card__head p {
    font-size: var(--ft-text-sm);
  }

  .networth-card__chart-container {
    height: 260px;
  }
}
</style>
