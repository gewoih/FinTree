<script setup lang="ts">
import { computed } from 'vue';

interface FinancialMetric {
  key: string;
  label: string;
  description: string;
  value: string;
}

const props = defineProps<{
  loading: boolean;
  metrics: FinancialMetric[];
  hasData: boolean;
  periodLabel: string;
}>();

const showEmptyState = computed(() => !props.loading && (!props.hasData || !props.metrics.length));
</script>

<template>
  <AppCard class="analytics-card analytics-card--health" padding="lg" elevated>
    <template #header>
      <div class="analytics-card__header">
        <div class="analytics-card__title">
          <i class="pi pi-heart-fill analytics-card__icon" aria-hidden="true" />
          <div>
            <h3 class="analytics-card__heading">Финансовое здоровье</h3>
            <p class="analytics-card__subtitle">
              Ключевые показатели за {{ periodLabel }}
            </p>
          </div>
        </div>
        <div v-if="$slots.actions" class="analytics-card__actions">
          <slot name="actions" />
        </div>
      </div>
    </template>

    <div v-if="loading" class="health-state health-state--loading" role="status" aria-live="polite">
      <i class="pi pi-spinner pi-spin health-state__icon" />
      <p class="health-state__title">Считаем показатели...</p>
      <p class="health-state__subtitle">Это может занять несколько секунд</p>
    </div>

    <div v-else-if="showEmptyState" class="health-state">
      <i class="pi pi-chart-line health-state__icon" aria-hidden="true" />
      <p class="health-state__title">Недостаточно данных</p>
      <p class="health-state__subtitle">
        Добавьте несколько транзакций и подождите, пока аналитика соберёт статистику.
      </p>
    </div>

    <div v-else class="health-metrics" role="list">
      <article
        v-for="metric in metrics"
        :key="metric.key"
        class="health-metric"
        role="listitem"
      >
        <p class="health-metric__label">{{ metric.label }}</p>
        <p class="health-metric__value">{{ metric.value }}</p>
        <p class="health-metric__description">{{ metric.description }}</p>
      </article>
    </div>
  </AppCard>
</template>

<style scoped>
.analytics-card {
  background: radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), rgba(15, 23, 42, 0.4));
  border: 1px solid rgba(148, 163, 184, 0.24);
  color: var(--ft-gray-100);
}

.analytics-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ft-space-4);
}

.analytics-card__title {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
}

.analytics-card__icon {
  font-size: 1.75rem;
  color: var(--ft-success-400);
}

.analytics-card__heading {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-gray-100);
}

.analytics-card__subtitle {
  margin: 0;
  color: rgba(226, 232, 240, 0.72);
  font-size: var(--ft-text-sm);
}

.analytics-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
  justify-content: flex-end;
}

.health-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--ft-space-4);
}

.health-metric {
  display: grid;
  gap: var(--ft-space-2);
  padding: var(--ft-space-4);
  border-radius: var(--ft-radius-lg);
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.4));
  transition: transform var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.health-metric:hover {
  transform: translateY(-3px);
  border-color: rgba(148, 163, 184, 0.38);
}

.health-metric__label {
  margin: 0;
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(226, 232, 240, 0.78);
}

.health-metric__value {
  margin: 0;
  font-size: clamp(1.75rem, 2.4vw, 2.25rem);
  font-weight: var(--ft-font-bold);
  color: var(--ft-gray-50);
  letter-spacing: -0.02em;
}

.health-metric__description {
  margin: 0;
  color: rgba(226, 232, 240, 0.75);
  font-size: var(--ft-text-sm);
  line-height: var(--ft-leading-relaxed);
}

.health-state {
  display: grid;
  gap: var(--ft-space-3);
  place-items: center;
  text-align: center;
  padding: var(--ft-space-6) var(--ft-space-4);
  color: rgba(226, 232, 240, 0.85);
}

.health-state__icon {
  font-size: var(--ft-text-3xl);
}

.health-state__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
}

.health-state__subtitle {
  margin: 0;
  font-size: var(--ft-text-sm);
  max-width: 32ch;
  color: rgba(226, 232, 240, 0.66);
}

@media (max-width: 768px) {
  .health-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
