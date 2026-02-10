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
  <AppCard
    class="analytics-card analytics-card--health"
    padding="lg"
    elevated
  >
    <template #header>
      <div class="analytics-card__head">
        <div class="analytics-card__title">
          <span class="analytics-card__icon">
            <i
              class="pi pi-heart-fill"
              aria-hidden="true"
            />
          </span>
          <div>
            <h3>Финансовое здоровье</h3>
            <p>Ключевые показатели за {{ periodLabel }}</p>
          </div>
        </div>
        <div
          v-if="$slots.actions"
          class="analytics-card__actions"
        >
          <slot name="actions" />
        </div>
      </div>
    </template>

    <div
      v-if="loading"
      class="health-state health-state--loading"
      role="status"
      aria-live="polite"
    >
      <i class="pi pi-spinner pi-spin health-state__icon" />
      <p class="health-state__title">
        Считаем показатели...
      </p>
      <p class="health-state__subtitle">
        Это может занять несколько секунд
      </p>
    </div>

    <div
      v-else-if="showEmptyState"
      class="health-state"
    >
      <i
        class="pi pi-chart-line health-state__icon"
        aria-hidden="true"
      />
      <p class="health-state__title">
        Недостаточно данных
      </p>
      <p class="health-state__subtitle">
        Добавьте несколько транзакций и подождите, пока аналитика соберёт статистику.
      </p>
    </div>

    <div
      v-else
      class="health-metrics"
      role="list"
    >
      <article
        v-for="metric in metrics"
        :key="metric.key"
        class="health-metric"
        role="listitem"
      >
        <p class="health-metric__label">
          {{ metric.label }}
        </p>
        <p class="health-metric__value">
          {{ metric.value }}
        </p>
        <p class="health-metric__description">
          {{ metric.description }}
        </p>
      </article>
    </div>
  </AppCard>
</template>

<style scoped>
.analytics-card {
  padding: clamp(var(--ft-space-5), 3vw, var(--ft-space-6));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-success-500) 22%, transparent),
    color-mix(in srgb, var(--ft-primary-500) 12%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--ft-success-500) 35%, transparent);
  border-radius: var(--ft-radius-2xl);
  box-shadow: var(--ft-shadow-card);
}

.analytics-card__head {
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

.analytics-card__title .analytics-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--ft-radius-lg);
  background: color-mix(in srgb, var(--ft-success-500) 24%, transparent);
  color: var(--ft-success-500);
}

.analytics-card__title h3 {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
}

.analytics-card__title p {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-muted);
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
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: var(--ft-space-4);
}

.health-metric {
  display: grid;
  gap: var(--ft-space-2);
  padding: var(--ft-space-4);
  border-radius: var(--ft-radius-xl);
  background: color-mix(in srgb, var(--ft-surface-base) 88%, transparent);
  border: 1px solid var(--ft-border-default);
}

.health-metric:hover {
  border-color: var(--ft-border-strong);
  transform: translateY(-2px);
}

.health-metric__label {
  margin: 0;
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ft-text-tertiary);
}

.health-metric__value {
  margin: 0;
  font-size: clamp(1.75rem, 2.4vw, 2.25rem);
  font-weight: var(--ft-font-bold);
  color: var(--ft-heading);
}

.health-metric__description {
  margin: 0;
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-sm);
  line-height: var(--ft-leading-relaxed);
}

.health-state {
  display: grid;
  gap: var(--ft-space-3);
  place-items: center;
  text-align: center;
  padding: var(--ft-space-6) var(--ft-space-4);
  color: var(--ft-text-secondary);
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
  color: var(--ft-text-tertiary);
}

@media (max-width: 768px) {
  .analytics-card__head {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ft-space-3);
  }
}
</style>
