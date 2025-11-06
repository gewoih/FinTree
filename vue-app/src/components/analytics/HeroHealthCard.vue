<script setup lang="ts">
import { computed } from 'vue';
import type { FinancialHealthMetricRow, FinancialHealthVerdict, HealthStatus } from '../../types/analytics';

const props = defineProps<{
  loading: boolean;
  error: string | null;
  metrics: FinancialHealthMetricRow[];
  score: number | null;
  verdict: FinancialHealthVerdict | null;
  period: number;
  periodOptions: ReadonlyArray<{ label: string; value: number }>;
}>();

const emit = defineEmits<{
  (event: 'retry'): void;
  (event: 'update:period', value: number): void;
}>();

const formattedScore = computed(() => {
  if (props.score == null || Number.isNaN(props.score)) {
    return '—';
  }
  return Math.round(props.score).toString();
});

const showEmpty = computed(
  () => !props.loading && !props.error && props.metrics.length === 0 && props.score == null
);

const verdictSeverity = computed(() => {
  switch (props.verdict?.status) {
    case 'good':
      return 'success';
    case 'average':
      return 'warning';
    case 'poor':
      return 'danger';
    default:
      return 'secondary';
  }
});

const verdictTagClass = computed(() => {
  if (!props.verdict) return null;
  return `hero-card__verdict hero-card__verdict--${props.verdict.status}`;
});

const metricStatusClass: Record<HealthStatus, string> = {
  good: 'hero-card__metric-status--good',
  average: 'hero-card__metric-status--average',
  poor: 'hero-card__metric-status--poor',
};
</script>

<template>
  <Card class="hero-card">
    <template #content>
      <div class="hero-card__header">
        <div>
          <p class="hero-card__eyebrow">Финансовое здоровье</p>
          <h2 class="hero-card__title">Индекс благополучия</h2>
          <p class="hero-card__subtitle">
            Комплексная оценка ваших финансов на основе последних транзакций.
          </p>
        </div>
        <SelectButton
          :modelValue="period"
          :options="periodOptions"
          optionLabel="label"
          optionValue="value"
          @update:modelValue="emit('update:period', $event)"
        />
      </div>

      <div v-if="loading" class="hero-card__loading">
        <Skeleton width="128px" height="128px" borderRadius="999px" />
        <div class="hero-card__loading-metrics">
          <Skeleton
            v-for="index in 4"
            :key="index"
            height="72px"
            width="100%"
            borderRadius="20px"
          />
        </div>
      </div>

      <div v-else-if="error" class="hero-card__message">
        <Message severity="error" icon="pi pi-exclamation-triangle" :closable="false">
          <div class="hero-card__message-body">
            <p class="hero-card__message-title">Не удалось загрузить данные</p>
            <p class="hero-card__message-text">{{ error }}</p>
            <Button
              label="Повторить"
              icon="pi pi-refresh"
              size="small"
              @click="emit('retry')"
            />
          </div>
        </Message>
      </div>

      <div v-else-if="showEmpty" class="hero-card__message">
        <Message severity="info" icon="pi pi-inbox" :closable="false">
          <div class="hero-card__message-body hero-card__message-body--compact">
            <p class="hero-card__message-title">Нет данных</p>
            <p class="hero-card__message-text">
              Добавьте несколько транзакций, чтобы увидеть расчёт индекса.
            </p>
          </div>
        </Message>
      </div>

      <div v-else class="hero-card__content">
        <div class="hero-card__score">
          <div class="hero-card__score-circle">
            <span class="hero-card__score-value">{{ formattedScore }}</span>
            <span class="hero-card__score-max">/ 100</span>
          </div>
          <div class="hero-card__score-meta">
            <Tag v-if="verdict" :severity="verdictSeverity" :class="verdictTagClass">
              {{ verdict.label }}
            </Tag>
            <p v-if="verdict?.helper" class="hero-card__score-helper">
              {{ verdict.helper }}
            </p>
          </div>
        </div>

        <div class="hero-card__metrics" role="list">
          <article
            v-for="metric in metrics"
            :key="metric.key"
            class="hero-card__metric"
            role="listitem"
            :title="metric.tooltip"
          >
            <div class="hero-card__metric-top">
              <span class="hero-card__metric-emoji" aria-hidden="true">{{ metric.emoji }}</span>
              <div class="hero-card__metric-text">
                <p class="hero-card__metric-label">{{ metric.label }}</p>
                <p class="hero-card__metric-flair">{{ metric.flair }}</p>
              </div>
              <p class="hero-card__metric-value">{{ metric.value }}</p>
            </div>
            <span
              class="hero-card__metric-status"
              :class="metricStatusClass[metric.status]"
            >
              {{ metric.statusLabel }}
            </span>
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
  gap: clamp(1.5rem, 2vw, 2.5rem);
}

.hero-card__score {
  display: flex;
  align-items: center;
  gap: clamp(1.25rem, 2vw, 2rem);
}

.hero-card__score-circle {
  width: clamp(110px, 14vw, 132px);
  aspect-ratio: 1;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ft-primary-100) 35%, transparent);
  border: 3px solid color-mix(in srgb, var(--ft-primary-400) 60%, transparent);
  display: grid;
  place-items: center;
  position: relative;
}

.hero-card__score-value {
  font-size: clamp(2.25rem, 4vw, 3rem);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
}

.hero-card__score-max {
  position: absolute;
  inset-block-end: 18px;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);
}

.hero-card__score-helper {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-sm);
  max-width: 32ch;
}

.hero-card__verdict {
  font-weight: var(--ft-font-semibold);
  text-transform: none;
}

.hero-card__verdict--good {
  background: color-mix(in srgb, var(--ft-success-200) 45%, transparent) !important;
  color: var(--ft-success-600) !important;
}

.hero-card__verdict--average {
  background: color-mix(in srgb, var(--ft-warning-200) 55%, transparent) !important;
  color: var(--ft-warning-600) !important;
}

.hero-card__verdict--poor {
  background: color-mix(in srgb, var(--ft-danger-200) 55%, transparent) !important;
  color: var(--ft-danger-600) !important;
}

.hero-card__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(0.75rem, 2vw, 1.4rem);
}

.hero-card__metric {
  position: relative;
  padding: clamp(1rem, 2vw, 1.35rem);
  border-radius: var(--ft-radius-xl);
  border: 1px solid color-mix(in srgb, var(--ft-border-subtle) 70%, transparent);
  background: color-mix(in srgb, var(--ft-surface-raised) 85%, transparent);
  display: grid;
  gap: var(--ft-space-3);
  transition: transform var(--ft-transition-base), box-shadow var(--ft-transition-base);
  cursor: help;
}

.hero-card__metric::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at top right, color-mix(in srgb, var(--ft-primary-200) 35%, transparent), transparent 70%);
  pointer-events: none;
  opacity: 0.35;
}

.hero-card__metric:hover {
  transform: translateY(-2px);
  box-shadow: var(--ft-shadow-md);
}

.hero-card__metric-top {
  display: flex;
  align-items: flex-start;
  gap: var(--ft-space-3);
}

.hero-card__metric-emoji {
  font-size: 1.5rem;
}

.hero-card__metric-text {
  display: grid;
  gap: var(--ft-space-1);
  flex: 1;
}

.hero-card__metric-label {
  margin: 0;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.hero-card__metric-flair {
  margin: 0;
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ft-text-secondary);
}

.hero-card__metric-value {
  margin: 0;
  font-size: clamp(1.5rem, 2.2vw, 1.85rem);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
}

.hero-card__metric-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  padding: 0.4rem 0.85rem;
  border-radius: var(--ft-radius-full);
  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-gray-200) 45%, transparent);
}

.hero-card__metric-status--good {
  color: var(--ft-success-700);
  background: color-mix(in srgb, var(--ft-success-100) 65%, transparent);
}

.hero-card__metric-status--average {
  color: var(--ft-warning-700);
  background: color-mix(in srgb, var(--ft-warning-100) 65%, transparent);
}

.hero-card__metric-status--poor {
  color: var(--ft-danger-700);
  background: color-mix(in srgb, var(--ft-danger-100) 65%, transparent);
}

@media (max-width: 768px) {
  .hero-card__score {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-card__score-circle {
    width: 108px;
  }
}
</style>
