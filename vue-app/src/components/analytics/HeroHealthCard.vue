<script setup lang="ts">
import { computed } from 'vue';
import type { FinancialHealthMetricRow, FinancialHealthVerdict, HealthStatus } from '../../types/analytics';

const props = withDefaults(
  defineProps<{
    loading: boolean;
    error: string | null;
    metrics: FinancialHealthMetricRow[];
    score: number | null;
    verdict: FinancialHealthVerdict | null;
    period: number;
    periodOptions: Array<{ label: string; value: number }>;
  }>(),
  {
    period: 6,
  }
);

const emit = defineEmits<{
  (event: 'retry'): void;
  (event: 'update:period', value: number): void;
}>();

const handlePeriodUpdate = (value: number) => {
  // Only emit valid positive numbers
  if (value && typeof value === 'number' && value > 0) {
    emit('update:period', value);
  }
};

const formattedScore = computed(() => {
  if (props.score == null || Number.isNaN(props.score)) {
    return '—';
  }
  return Math.round(props.score).toString();
});

const showEmpty = computed(
  () => !props.loading && !props.error && props.metrics.length === 0 && props.score == null
);

const metricStatusClass: Record<HealthStatus, string> = {
  good: 'hero-card__metric-status--good',
  average: 'hero-card__metric-status--average',
  poor: 'hero-card__metric-status--poor',
};

const scoreCircleClass = computed(() => {
  if (!props.verdict?.status) return null;
  return `hero-card__score-circle--${props.verdict.status}`;
});
</script>

<template>
  <Card class="hero-card">
    <template #content>
      <div class="hero-card__header">
        <div>
          <p class="hero-card__eyebrow">
            Финансовое здоровье
          </p>
          <h2 class="hero-card__title">
            Финансовое здоровье
          </h2>
          <p class="hero-card__subtitle">
            Комплексная оценка ваших финансов на основе последних транзакций.
          </p>
        </div>
        <SelectButton
          :model-value="period"
          :options="periodOptions"
          option-label="label"
          option-value="value"
          @update:model-value="handlePeriodUpdate"
        />
      </div>

      <div
        v-if="loading"
        class="hero-card__loading"
      >
        <Skeleton
          width="128px"
          height="128px"
          border-radius="999px"
        />
        <div class="hero-card__loading-metrics">
          <Skeleton
            v-for="index in 4"
            :key="index"
            height="72px"
            width="100%"
            border-radius="20px"
          />
        </div>
      </div>

      <div
        v-else-if="error"
        class="hero-card__message"
      >
        <Message
          severity="error"
          icon="pi pi-exclamation-triangle"
          :closable="false"
        >
          <div class="hero-card__message-body">
            <p class="hero-card__message-title">
              Не удалось загрузить данные
            </p>
            <p class="hero-card__message-text">
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
        class="hero-card__message"
      >
        <Message
          severity="info"
          icon="pi pi-inbox"
          :closable="false"
        >
          <div class="hero-card__message-body hero-card__message-body--compact">
            <p class="hero-card__message-title">
              Нет данных
            </p>
            <p class="hero-card__message-text">
              Добавьте несколько транзакций, чтобы увидеть расчёт индекса.
            </p>
          </div>
        </Message>
      </div>

      <div
        v-else
        class="hero-card__content"
      >
        <div class="hero-card__score">
          <div
            class="hero-card__score-circle"
            :class="scoreCircleClass"
          >
            <span class="hero-card__score-value">{{ formattedScore }}</span>
            <span class="hero-card__score-max">/ 100</span>
          </div>
        </div>

        <div
          class="hero-card__metrics"
          role="list"
        >
          <article
            v-for="metric in metrics"
            :key="metric.key"
            class="hero-card__metric"
            :class="metricStatusClass[metric.status]"
            role="listitem"
          >
            <div class="hero-card__metric-content">
              <div class="hero-card__metric-header">
                <p class="hero-card__metric-label">
                  {{ metric.label }}
                </p>
                <i
                  v-tooltip.top="metric.tooltip"
                  class="pi pi-question-circle hero-card__metric-info"
                />
              </div>
              <p class="hero-card__metric-value">
                {{ metric.value }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.hero-card {
  background: var(--ft-surface-base);
  border-radius: var(--ft-radius-2xl);
  border: 1px solid var(--ft-border-subtle);
  padding: clamp(1.25rem, 2vw, 1.75rem);
  display: grid;
  gap: clamp(1.25rem, 2vw, 1.75rem);
  box-shadow: var(--ft-shadow-sm);
}

.hero-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ft-space-4);
}

.hero-card__eyebrow {
  margin: 0 0 var(--ft-space-1);
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ft-text-secondary);
}

.hero-card__title {
  margin: 0;
  font-size: clamp(1.5rem, 2vw, 1.875rem);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.hero-card__subtitle {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-secondary);
  max-width: 46ch;
  line-height: var(--ft-leading-relaxed);
}

.hero-card__loading {
  display: grid;
  gap: var(--ft-space-5);
}

.hero-card__loading-metrics {
  display: grid;
  gap: var(--ft-space-3);
}

.hero-card__message {
  display: grid;
}

.hero-card__message-body {
  display: grid;
  gap: var(--ft-space-3);
}

.hero-card__message-body--compact {
  gap: var(--ft-space-2);
}

.hero-card__message-title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.hero-card__message-text {
  margin: 0;
}

.hero-card__content {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: clamp(1.5rem, 3vw, 3rem);
  align-items: center;
}

.hero-card__score {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-card__score-circle {
  width: clamp(120px, 14vw, 140px);
  aspect-ratio: 1;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ft-primary-100) 35%, transparent);
  border: 3px solid color-mix(in srgb, var(--ft-primary-400) 60%, transparent);
  display: grid;
  place-items: center;
  position: relative;
  transition: all var(--ft-transition-base);
}

.hero-card__score-circle--good {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.06) 100%);
  border-color: rgba(34, 197, 94, 0.4);
}

.hero-card__score-circle--average {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.12) 0%, rgba(251, 146, 60, 0.06) 100%);
  border-color: rgba(251, 146, 60, 0.4);
}

.hero-card__score-circle--poor {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.06) 100%);
  border-color: rgba(239, 68, 68, 0.4);
}

.hero-card__score-value {
  font-size: clamp(2.25rem, 4vw, 2.75rem);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
}

.hero-card__score-max {
  position: absolute;
  inset-block-end: 16px;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);
}

.hero-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(0.75rem, 1.5vw, 1rem);
}

.hero-card__metric {
  position: relative;
  padding: clamp(1.25rem, 2vw, 1.5rem);
  border-radius: var(--ft-radius-xl);
  border: 1px solid;
  display: grid;
  gap: var(--ft-space-2);
  transition: transform var(--ft-transition-base), box-shadow var(--ft-transition-base);
}

.hero-card__metric:hover {
  transform: translateY(-2px);
  box-shadow: var(--ft-shadow-md);
}

.hero-card__metric-content {
  display: grid;
  gap: var(--ft-space-3);
}

.hero-card__metric-header {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.hero-card__metric-label {
  margin: 0;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  flex: 1;
}

.hero-card__metric-info {
  font-size: var(--ft-text-sm);
  opacity: 0.5;
  cursor: help;
  transition: opacity var(--ft-transition-fast);
}

.hero-card__metric-info:hover {
  opacity: 0.8;
}

.hero-card__metric-value {
  margin: 0;
  font-size: clamp(1.75rem, 2.5vw, 2rem);
  font-weight: var(--ft-font-bold);
}

.hero-card__metric-status--good {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.04) 100%);
  border-color: rgba(34, 197, 94, 0.25);
  color: #4ade80;
}

.hero-card__metric-status--average {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, rgba(251, 146, 60, 0.04) 100%);
  border-color: rgba(251, 146, 60, 0.25);
  color: #fb923c;
}

.hero-card__metric-status--poor {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.04) 100%);
  border-color: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

@media (max-width: 992px) {
  .hero-card__content {
    grid-template-columns: 1fr;
    gap: clamp(1rem, 2vw, 1.5rem);
  }

  .hero-card__score {
    justify-content: flex-start;
  }

  .hero-card__score-circle {
    width: clamp(90px, 12vw, 100px);
  }

  .hero-card__score-value {
    font-size: clamp(1.75rem, 3vw, 2rem);
  }

  .hero-card__score-max {
    inset-block-end: 12px;
  }

  .hero-card__metrics {
    grid-template-columns: 1fr;
  }
}
</style>
