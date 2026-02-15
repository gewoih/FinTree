<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
import Message from 'primevue/message';
import UiButton from '../../ui/UiButton.vue';

type MetricAccent = 'income' | 'expense' | 'good' | 'poor' | 'neutral';

interface SummaryMetric {
  key: string;
  label: string;
  value: string;
  icon: string;
  accent: MetricAccent;
  tooltip: string;
  secondary?: string;
}

defineProps<{
  loading: boolean;
  error: string | null;
  metrics: SummaryMetric[];
}>();

const emit = defineEmits<{
  (event: 'retry'): void;
}>();

const accentClass = (accent: MetricAccent) => `summary-strip__value--${accent}`;
const iconAccentClass = (accent: MetricAccent) => `summary-strip__icon--${accent}`;
</script>

<template>
  <div class="summary-strip">
    <template v-if="loading">
      <div
        v-for="i in 3"
        :key="i"
        class="summary-strip__item summary-strip__item--skeleton"
      >
        <Skeleton
          width="40px"
          height="40px"
          border-radius="12px"
        />
        <div class="summary-strip__skeleton-text">
          <Skeleton
            width="80px"
            height="14px"
          />
          <Skeleton
            width="120px"
            height="28px"
          />
        </div>
      </div>
    </template>

    <template v-else-if="error">
      <div class="summary-strip__error">
        <Message
          severity="error"
          icon="pi pi-exclamation-triangle"
          :closable="false"
        >
          <div class="summary-strip__error-body">
            <p class="summary-strip__error-title">
              Не удалось загрузить сводку
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
    </template>

    <template v-else>
      <div
        v-for="metric in metrics"
        :key="metric.key"
        v-tooltip.bottom="metric.tooltip"
        class="summary-strip__item"
      >
        <span
          class="summary-strip__icon"
          :class="iconAccentClass(metric.accent)"
        >
          <i :class="metric.icon" />
        </span>
        <div class="summary-strip__text">
          <p class="summary-strip__label">
            {{ metric.label }}
          </p>
          <p
            class="summary-strip__value"
            :class="accentClass(metric.accent)"
          >
            {{ metric.value }}
          </p>
          <p
            v-if="metric.secondary"
            class="summary-strip__secondary"
          >
            {{ metric.secondary }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--ft-space-4);

  padding: var(--ft-space-5);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-2xl);
  box-shadow: var(--ft-shadow-sm);
}

.summary-strip__item {
  cursor: help;

  display: flex;
  gap: var(--ft-space-3);
  align-items: flex-start;

  padding: var(--ft-space-3);

  border-radius: var(--ft-radius-xl);

  transition: background var(--ft-transition-fast);
}

.summary-strip__item:hover {
  background: color-mix(in srgb, var(--ft-surface-raised) 60%, transparent);
}

.summary-strip__item--skeleton {
  cursor: default;
}

.summary-strip__item--skeleton:hover {
  background: transparent;
}

.summary-strip__skeleton-text {
  display: grid;
  gap: var(--ft-space-2);
}

.summary-strip__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;

  width: 44px;
  height: 44px;

  font-size: 1.1rem;
  color: var(--ft-text-secondary);

  background: color-mix(in srgb, var(--ft-surface-raised) 80%, transparent);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);
}

.summary-strip__icon--income {
  color: var(--ft-success-400);
  background: color-mix(in srgb, var(--ft-success-400) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-success-400) 25%, transparent);
}

.summary-strip__icon--expense {
  color: var(--ft-danger-400);
  background: color-mix(in srgb, var(--ft-danger-400) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-danger-400) 25%, transparent);
}

.summary-strip__icon--good {
  color: var(--ft-success-400);
  background: color-mix(in srgb, var(--ft-success-400) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-success-400) 25%, transparent);
}

.summary-strip__icon--poor {
  color: var(--ft-danger-400);
  background: color-mix(in srgb, var(--ft-danger-400) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-danger-400) 25%, transparent);
}

.summary-strip__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.summary-strip__label {
  margin: 0;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-strip__value {
  margin: 0;

  font-size: clamp(1.5rem, 2.5vw, 2rem);
  font-weight: var(--ft-font-bold);
  line-height: 1.15;
  color: var(--ft-text-primary);
}

.summary-strip__value--income {
  color: var(--ft-success-400);
}

.summary-strip__value--expense {
  color: var(--ft-danger-400);
}

.summary-strip__value--good {
  color: var(--ft-success-400);
}

.summary-strip__value--poor {
  color: var(--ft-danger-400);
}

.summary-strip__secondary {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.summary-strip__error {
  grid-column: 1 / -1;
}

.summary-strip__error-body {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
}

.summary-strip__error-title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

@media (width <= 640px) {
  .summary-strip {
    grid-template-columns: 1fr;
    gap: var(--ft-space-2);
    padding: var(--ft-space-4);
  }

  .summary-strip__item {
    padding: var(--ft-space-2);
  }

  .summary-strip__value {
    font-size: 1.25rem;
  }

  .summary-strip__icon {
    width: 38px;
    height: 38px;
    font-size: 1rem;
  }
}
</style>
