<script setup lang="ts">
import { computed, ref } from 'vue';

type MetricAccent = 'good' | 'average' | 'poor' | 'neutral' | 'income' | 'expense';

interface HealthTile {
  key: string;
  label: string;
  value: string;
  meta?: string | null;
  tooltip?: string;
  icon: string;
  accent?: MetricAccent;
}

interface PeakDayItem {
  label: string;
  amountLabel: string;
  amount: number;
  date: Date;
  shareLabel: string;
}

interface PeaksSummary {
  count: number;
  totalLabel: string;
  shareLabel: string;
  shareValue: number | null;
  monthLabel: string;
}

interface HealthGroup {
  key: string;
  title: string;
  metrics: HealthTile[];
}

const props = withDefaults(
  defineProps<{
    loading: boolean;
    error: string | null;
    groups: HealthGroup[];
    peaks: PeakDayItem[];
    peaksSummary: PeaksSummary;
  }>(),
  {
    groups: () => [],
    peaks: () => [],
    peaksSummary: () => ({ count: 0, totalLabel: '—', shareLabel: '—', shareValue: null, monthLabel: '—' }),
  }
);

const emit = defineEmits<{
  (event: 'retry'): void;
  (event: 'select-peak', value: PeakDayItem): void;
  (event: 'select-peak-summary'): void;
}>();

const showEmpty = computed(() => {
  if (props.loading || props.error) return false;
  const hasMetricData = props.groups.some(group => group.metrics.some(metric => metric.value !== '—'));
  return !hasMetricData && props.peaks.length === 0;
});

const metricValueClass = (accent?: MetricAccent) =>
  accent ? `hero-card__metric-value--${accent}` : null;

const metricIconClass = (accent?: MetricAccent) =>
  accent ? `hero-card__metric-icon--${accent}` : null;

const peaksShareClass = computed(() => {
  const share = props.peaksSummary.shareValue;
  if (share == null) return 'hero-card__peak-share--neutral';
  if (share <= 30) return 'hero-card__peak-share--good';
  if (share <= 50) return 'hero-card__peak-share--average';
  return 'hero-card__peak-share--poor';
});

const showAllPeaks = ref(false);

const visiblePeaks = computed(() => {
  if (showAllPeaks.value) return props.peaks;
  return props.peaks.slice(0, 3);
});

const hasMorePeaks = computed(() => props.peaks.length > 3);
</script>

<template>
  <Card class="hero-card">
    <template #content>
      <div class="hero-card__header">
        <div>
          <h2 class="hero-card__title">
            Финансовое здоровье
          </h2>
        </div>
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
              Добавьте несколько транзакций, чтобы увидеть метрики.
            </p>
          </div>
        </Message>
      </div>

      <div
        v-else
        class="hero-card__content"
      >
        <div class="hero-card__insights">
          <div
            class="hero-card__metrics"
            role="list"
          >
            <article
              v-for="group in groups"
              :key="group.key"
              class="hero-card__metric hero-card__group"
              :class="group.accent ? `hero-card__group--${group.accent}` : null"
              role="listitem"
            >
              <p class="hero-card__group-title">
                {{ group.title }}
              </p>
              <div class="hero-card__group-list">
                <div
                  v-for="metric in group.metrics"
                  :key="metric.key"
                  class="hero-card__metric-row"
                >
                  <div class="hero-card__metric-text">
                    <p class="hero-card__metric-label">
                      {{ metric.label }}
                    </p>
                    <p
                      class="hero-card__metric-value hero-card__metric-value--compact"
                      :class="metricValueClass(metric.accent)"
                    >
                      {{ metric.value }}
                    </p>
                    <p
                      v-if="metric.meta"
                      class="hero-card__metric-meta"
                    >
                      {{ metric.meta }}
                    </p>
                  </div>
                  <span
                    class="hero-card__metric-icon"
                    :class="metricIconClass(metric.accent)"
                    v-tooltip.top="metric.tooltip"
                  >
                    <i :class="metric.icon" />
                  </span>
                </div>
              </div>
            </article>
          </div>

          <div class="hero-card__peaks">
            <div class="hero-card__peaks-header">
              <p class="hero-card__peaks-title">Пиковые дни</p>
            </div>
            <button
              type="button"
              class="hero-card__peak-share"
              :class="peaksShareClass"
              @click="emit('select-peak-summary')"
            >
              <p class="hero-card__peak-share-value">
                {{ peaksSummary.shareLabel }}
              </p>
              <p class="hero-card__peak-share-line">
                расходов сформированы пиковыми днями
              </p>
              <p class="hero-card__peak-share-meta">
                {{ peaksSummary.count }} дней · {{ peaksSummary.totalLabel }} из {{ peaksSummary.monthLabel }}
              </p>
            </button>
            <div class="hero-card__peaks-divider" />
            <div
              class="hero-card__peaks-grid"
              role="list"
            >
              <button
                v-for="peak in visiblePeaks"
                :key="peak.label"
                type="button"
                class="hero-card__metric hero-card__metric--clickable hero-card__peak-item"
                role="listitem"
                @click="emit('select-peak', peak)"
              >
                <div class="hero-card__metric-content">
                  <p class="hero-card__metric-label">
                    {{ peak.label }}
                  </p>
                  <p class="hero-card__metric-value">
                    {{ peak.amountLabel }}
                  </p>
                  <p class="hero-card__metric-meta">
                    {{ peak.shareLabel }} от месяца
                  </p>
                </div>
              </button>

              <div
                v-if="!peaks.length"
                class="hero-card__metric hero-card__metric--empty hero-card__peak-item"
                role="listitem"
              >
                <div class="hero-card__metric-content">
                  <p class="hero-card__metric-label">
                    Нет пиковых дней
                  </p>
                  <p class="hero-card__metric-value">
                    Расходы стабильны
                  </p>
                </div>
              </div>
            </div>
            <button
              v-if="hasMorePeaks"
              type="button"
              class="hero-card__peaks-toggle"
              @click="showAllPeaks = !showAllPeaks"
            >
              {{ showAllPeaks ? 'Свернуть' : 'Показать все' }}
            </button>
          </div>
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
  gap: var(--ft-space-4);
}

.hero-card__insights {
  display: grid;
  gap: var(--ft-space-5);
  grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
  align-items: start;
}

.hero-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.6rem, 1.2vw, 0.9rem);
}

.hero-card__metric {
  position: relative;
  padding: clamp(1rem, 1.7vw, 1.25rem);
  border-radius: var(--ft-radius-xl);
  border: 1px solid var(--ft-border-subtle);
  display: grid;
  gap: var(--ft-space-3);
  background: color-mix(in srgb, var(--ft-surface-raised) 85%, transparent);
  color: var(--ft-text-primary);
  transition: transform var(--ft-transition-base), box-shadow var(--ft-transition-base);
}

.hero-card__metric:hover {
  transform: translateY(-2px);
  box-shadow: var(--ft-shadow-md);
}

.hero-card__metric--clickable {
  cursor: pointer;
  text-align: left;
  width: 100%;
  border: 1px solid var(--ft-border-subtle);
  font: inherit;
}

.hero-card__metric--clickable:hover {
  border-color: color-mix(in srgb, var(--ft-border-strong, #94a3b8) 45%, transparent);
}

.hero-card__metric--clickable:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500, #3b82f6) 65%, transparent);
  outline-offset: 2px;
}

.hero-card__metric--empty {
  background: color-mix(in srgb, var(--ft-surface-base) 92%, transparent);
}

.hero-card__group {
  --group-accent: color-mix(in srgb, var(--ft-border-strong, #94a3b8) 40%, transparent);
}

.hero-card__group--good {
  --group-accent: var(--ft-success-400, #4ade80);
}

.hero-card__group--average {
  --group-accent: var(--ft-warning-400, #fb923c);
}

.hero-card__group--poor {
  --group-accent: var(--ft-danger-400, #f87171);
}

.hero-card__group-title {
  margin: 0;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ft-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.hero-card__group-title::before {
  content: '';
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--group-accent);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--group-accent) 14%, transparent);
}

.hero-card__group-list {
  display: grid;
  gap: var(--ft-space-2);
}

.hero-card__metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-3);
  padding: 0.35rem 0;
}

.hero-card__metric-row + .hero-card__metric-row {
  border-top: 1px solid var(--ft-border-subtle);
}

.hero-card__metric-text {
  display: grid;
  gap: 0.15rem;
}

.hero-card__metric-content {
  display: grid;
  gap: var(--ft-space-3);
}

.hero-card__metric-label {
  margin: 0;
  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-medium);
  flex: 1;
}

.hero-card__metric-value {
  margin: 0;
  font-size: clamp(1.6rem, 2.4vw, 2rem);
  font-weight: var(--ft-font-bold);
}

.hero-card__metric-value--compact {
  font-size: clamp(1.15rem, 1.9vw, 1.35rem);
}

.hero-card__metric-meta {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);
}

.hero-card__metric-icon {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  color: var(--ft-text-secondary);
  background: color-mix(in srgb, var(--ft-surface-base) 75%, transparent);
  border: 1px solid var(--ft-border-subtle);
  flex-shrink: 0;
  cursor: help;
}

.hero-card__metric-value--good,
.hero-card__metric-icon--good {
  color: var(--ft-success-400, #4ade80);
}

.hero-card__metric-value--average,
.hero-card__metric-icon--average {
  color: var(--ft-warning-400, #fb923c);
}

.hero-card__metric-value--poor,
.hero-card__metric-icon--poor {
  color: var(--ft-danger-400, #f87171);
}

.hero-card__metric-value--income,
.hero-card__metric-icon--income {
  color: var(--ft-success-400, #4ade80);
}

.hero-card__metric-value--expense,
.hero-card__metric-icon--expense {
  color: var(--ft-danger-400, #f87171);
}

.hero-card__metric-value--neutral,
.hero-card__metric-icon--neutral {
  color: var(--ft-text-secondary);
}

.hero-card__metric-icon--good {
  background: color-mix(in srgb, var(--ft-success-400, #4ade80) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-success-400, #4ade80) 25%, var(--ft-border-subtle));
}

.hero-card__metric-icon--average {
  background: color-mix(in srgb, var(--ft-warning-400, #fb923c) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-warning-400, #fb923c) 25%, var(--ft-border-subtle));
}

.hero-card__metric-icon--poor {
  background: color-mix(in srgb, var(--ft-danger-400, #f87171) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-danger-400, #f87171) 25%, var(--ft-border-subtle));
}

.hero-card__metric-icon--income {
  background: color-mix(in srgb, var(--ft-success-400, #4ade80) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-success-400, #4ade80) 25%, var(--ft-border-subtle));
}

.hero-card__metric-icon--expense {
  background: color-mix(in srgb, var(--ft-danger-400, #f87171) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-danger-400, #f87171) 25%, var(--ft-border-subtle));
}
.hero-card__peaks {
  display: grid;
  gap: var(--ft-space-4);
  padding: var(--ft-space-4);
  border-radius: var(--ft-radius-xl);
  background: color-mix(in srgb, var(--ft-surface-soft) 70%, transparent);
}

.hero-card__peaks-header {
  display: grid;
  gap: var(--ft-space-1);
}

.hero-card__peaks-title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ft-text-secondary);
}

.hero-card__peak-share {
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);
  padding: var(--ft-space-4);
  display: grid;
  gap: var(--ft-space-2);
  background: transparent;
  text-align: left;
  width: 100%;
  cursor: pointer;
}

.hero-card__peak-share:hover {
  border-color: color-mix(in srgb, var(--ft-border-strong, #94a3b8) 45%, transparent);
}

.hero-card__peak-share:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500, #3b82f6) 55%, transparent);
  outline-offset: 2px;
}

.hero-card__peak-share-value {
  margin: 0;
  font-size: clamp(2.4rem, 3.4vw, 3rem);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  line-height: 1;
}

.hero-card__peak-share-line {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.hero-card__peak-share-meta {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.hero-card__peaks-divider {
  height: 1px;
  background: var(--ft-border-subtle);
}

.hero-card__peak-share--good {
  border-color: color-mix(in srgb, var(--ft-success-400, #4ade80) 40%, var(--ft-border-subtle));
}

.hero-card__peak-share--average {
  border-color: color-mix(in srgb, var(--ft-warning-400, #fb923c) 40%, var(--ft-border-subtle));
}

.hero-card__peak-share--poor {
  border-color: color-mix(in srgb, var(--ft-orange-400, #fb923c) 45%, var(--ft-border-subtle));
}

.hero-card__peak-share--good .hero-card__peak-share-value {
  color: var(--ft-success-400, #4ade80);
}

.hero-card__peak-share--average .hero-card__peak-share-value {
  color: var(--ft-warning-400, #fb923c);
}

.hero-card__peak-share--poor .hero-card__peak-share-value {
  color: var(--ft-orange-400, #fb923c);
}

.hero-card__peaks-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--ft-space-3);
}

.hero-card__peak-item {
  padding: var(--ft-space-2);
  background: var(--ft-surface-base);
  box-shadow: none;
}

.hero-card__peak-item .hero-card__metric-label {
  font-size: var(--ft-text-sm);
}

.hero-card__peak-item .hero-card__metric-value {
  font-size: clamp(1.15rem, 1.8vw, 1.4rem);
}

.hero-card__peak-item .hero-card__metric-meta {
  font-size: var(--ft-text-sm);
}

.hero-card__peaks-toggle {
  border: none;
  background: transparent;
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  cursor: pointer;
  padding: 0;
  text-align: left;
}

@media (max-width: 992px) {
  .hero-card__insights {
    grid-template-columns: 1fr;
  }

  .hero-card__metrics {
    grid-template-columns: 1fr;
  }
}
</style>
