<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FinancialHealthVerdict } from '../../types/analytics';

interface HealthTile {
  key: string;
  label: string;
  value: string;
  meta?: string | null;
  tooltip?: string;
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
}

const props = withDefaults(
  defineProps<{
    loading: boolean;
    error: string | null;
    tiles: HealthTile[];
    peaks: PeakDayItem[];
    peaksSummary: PeaksSummary;
    monthLabel: string;
    score: number | null;
    verdict: FinancialHealthVerdict | null;
    period: number;
    periodOptions: Array<{ label: string; value: number }>;
  }>(),
  {
    period: 6,
    tiles: () => [],
    peaks: () => [],
    peaksSummary: () => ({ count: 0, totalLabel: '—', shareLabel: '—' }),
    monthLabel: '',
  }
);

const emit = defineEmits<{
  (event: 'retry'): void;
  (event: 'update:period', value: number): void;
  (event: 'select-peak', value: PeakDayItem): void;
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

const showEmpty = computed(() => {
  if (props.loading || props.error) return false;
  const hasTileData = props.tiles.some(tile => tile.value !== '—');
  return !hasTileData && props.score == null && props.peaks.length === 0;
});

const scoreCircleClass = computed(() => {
  if (!props.verdict?.status) return null;
  return `hero-card__score-circle--${props.verdict.status}`;
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
          <div class="hero-card__score-stack">
            <div
              class="hero-card__score-circle"
              :class="scoreCircleClass"
            >
              <span class="hero-card__score-value">{{ formattedScore }}</span>
              <span class="hero-card__score-max">/ 100</span>
            </div>
            <div
              v-if="verdict"
              class="hero-card__score-meta"
            >
              <p class="hero-card__score-label">{{ verdict.label }}</p>
              <p class="hero-card__score-helper">{{ verdict.helper }}</p>
            </div>
          </div>
        </div>

        <div class="hero-card__insights">
          <div
            class="hero-card__metrics"
            role="list"
          >
            <article
              v-for="tile in tiles"
              :key="tile.key"
              class="hero-card__metric"
              :class="tile.status ? `hero-card__metric--${tile.status}` : null"
              role="listitem"
            >
              <div class="hero-card__metric-content">
                <div class="hero-card__metric-header">
                  <p class="hero-card__metric-label">
                    {{ tile.label }}
                  </p>
                  <i
                    v-if="tile.tooltip"
                    v-tooltip.top="tile.tooltip"
                    class="pi pi-question-circle hero-card__metric-info"
                  />
                </div>
                <p class="hero-card__metric-value">
                  {{ tile.value }}
                </p>
                <p
                  v-if="tile.meta"
                  class="hero-card__metric-meta"
                >
                  {{ tile.meta }}
                </p>
              </div>
            </article>
          </div>

          <div class="hero-card__peaks">
            <div class="hero-card__peaks-header">
              <p class="hero-card__peaks-title">Пиковые дни</p>
              <p class="hero-card__peaks-summary">
                {{ peaksSummary.count }} дней · {{ peaksSummary.totalLabel }} · {{ peaksSummary.shareLabel }} от месяца
              </p>
            </div>
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

.hero-card__score-stack {
  display: grid;
  gap: var(--ft-space-3);
  justify-items: center;
  text-align: center;
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

.hero-card__score-meta {
  display: grid;
  gap: var(--ft-space-1);
  max-width: 220px;
}

.hero-card__score-label {
  margin: 0;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.hero-card__score-helper {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);
  line-height: var(--ft-leading-relaxed);
}

.hero-card__insights {
  display: grid;
  gap: var(--ft-space-4);
  grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
  align-items: start;
}

.hero-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.75rem, 1.5vw, 1rem);
}

.hero-card__metric {
  position: relative;
  padding: clamp(1.25rem, 2vw, 1.5rem);
  border-radius: var(--ft-radius-xl);
  border: 1px solid var(--ft-border-subtle);
  display: grid;
  gap: var(--ft-space-2);
  background: color-mix(in srgb, var(--ft-surface-raised) 85%, transparent);
  color: var(--ft-text-primary);
  transition: transform var(--ft-transition-base), box-shadow var(--ft-transition-base);
}

.hero-card__metric:hover {
  transform: translateY(-2px);
  box-shadow: var(--ft-shadow-md);
}

.hero-card__metric--good {
  border-color: color-mix(in srgb, var(--ft-success-400) 35%, var(--ft-border-subtle));
  background: color-mix(in srgb, var(--ft-success-50, #ecfdf5) 35%, var(--ft-surface-raised));
  color: var(--ft-success-700, #166534);
}

.hero-card__metric--average {
  border-color: color-mix(in srgb, var(--ft-warning-400) 35%, var(--ft-border-subtle));
  background: color-mix(in srgb, var(--ft-warning-50, #fff7ed) 35%, var(--ft-surface-raised));
  color: var(--ft-warning-700, #9a3412);
}

.hero-card__metric--poor {
  border-color: color-mix(in srgb, var(--ft-danger-400, #f87171) 60%, var(--ft-border-subtle));
  background: color-mix(in srgb, var(--ft-danger-400, #f87171) 18%, var(--ft-surface-raised));
  color: var(--ft-danger-300, #fecaca);
}

.hero-card__metric--neutral {
  border-color: var(--ft-border-subtle);
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

.hero-card__metric-meta {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);
}

.hero-card__peaks {
  display: grid;
  gap: var(--ft-space-3);
  padding: var(--ft-space-3);
  border-radius: var(--ft-radius-xl);
  background: color-mix(in srgb, var(--ft-surface-soft) 70%, transparent);
}

.hero-card__peaks-header {
  display: grid;
  gap: var(--ft-space-1);
}

.hero-card__peaks-title {
  margin: 0;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ft-text-secondary);
}

.hero-card__peaks-subtitle {
  margin: 0;
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-xs);
}

.hero-card__peaks-summary {
  margin: 0;
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-xs);
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
  font-size: var(--ft-text-xs);
}

.hero-card__peak-item .hero-card__metric-value {
  font-size: var(--ft-text-lg);
}

.hero-card__peak-item .hero-card__metric-meta {
  font-size: var(--ft-text-xs);
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

  .hero-card__score-stack {
    justify-items: flex-start;
    text-align: left;
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

  .hero-card__insights {
    grid-template-columns: 1fr;
  }
}
</style>
