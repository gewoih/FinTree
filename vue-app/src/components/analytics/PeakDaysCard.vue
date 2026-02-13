<script setup lang="ts">
import { computed, ref } from 'vue';

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

const props = withDefaults(
  defineProps<{
    loading: boolean;
    error: string | null;
    peaks: PeakDayItem[];
    summary: PeaksSummary;
  }>(),
  {
    peaks: () => [],
    summary: () => ({ count: 0, totalLabel: '—', shareLabel: '—', shareValue: null, monthLabel: '—' }),
  }
);

const emit = defineEmits<{
  (event: 'retry'): void;
  (event: 'select-peak', value: PeakDayItem): void;
  (event: 'select-peak-summary'): void;
}>();

const showAll = ref(false);
const hasMore = computed(() => props.peaks.length > 3);
const visiblePeaks = computed(() => showAll.value ? props.peaks : props.peaks.slice(0, 3));

const showEmpty = computed(() => !props.loading && !props.error && props.peaks.length === 0);

const shareAccent = computed(() => {
  const share = props.summary.shareValue;
  if (share == null) return 'neutral';
  if (share <= 30) return 'good';
  if (share <= 50) return 'average';
  return 'poor';
});
</script>

<template>
  <div class="peak-days">
    <div class="peak-days__header">
      <div>
        <h3
          v-tooltip.top="'Дни, когда расходы значительно превысили среднедневной уровень. Помогает выявить крупные разовые траты.'"
          class="peak-days__title"
        >
          <i class="pi pi-bolt" />
          Пиковые дни
        </h3>
      </div>
    </div>

    <div
      v-if="loading"
      class="peak-days__loading"
    >
      <Skeleton
        width="100%"
        height="60px"
        border-radius="12px"
      />
      <Skeleton
        v-for="i in 2"
        :key="i"
        width="100%"
        height="44px"
        border-radius="10px"
      />
    </div>

    <div
      v-else-if="error"
      class="peak-days__message"
    >
      <Message
        severity="error"
        icon="pi pi-exclamation-triangle"
        :closable="false"
      >
        <div class="peak-days__message-body">
          <p>Не удалось загрузить данные</p>
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
      class="peak-days__message"
    >
      <Message
        severity="info"
        icon="pi pi-check-circle"
        :closable="false"
      >
        <p>Пиковых дней нет — расходы стабильны.</p>
      </Message>
    </div>

    <template v-else>
      <button
        type="button"
        class="peak-days__summary"
        :class="`peak-days__summary--${shareAccent}`"
        @click="emit('select-peak-summary')"
      >
        <span class="peak-days__share-value">{{ summary.shareLabel }}</span>
        <span class="peak-days__share-text">расходов в пиковые дни</span>
        <span class="peak-days__share-meta">{{ summary.count }} дней &middot; {{ summary.totalLabel }} из {{ summary.monthLabel }}</span>
      </button>

      <div class="peak-days__list">
        <button
          v-for="peak in visiblePeaks"
          :key="peak.label"
          type="button"
          class="peak-days__item"
          @click="emit('select-peak', peak)"
        >
          <span class="peak-days__item-date">{{ peak.label }}</span>
          <span class="peak-days__item-amount">{{ peak.amountLabel }}</span>
          <span class="peak-days__item-share">{{ peak.shareLabel }}</span>
        </button>
      </div>

      <button
        v-if="hasMore"
        type="button"
        class="peak-days__toggle"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'Свернуть' : `Показать все (${peaks.length})` }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.peak-days {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  padding: clamp(1rem, 2vw, 1.5rem);
  background: var(--ft-surface-base);
  border-radius: var(--ft-radius-2xl);
  border: 1px solid var(--ft-border-subtle);
  box-shadow: var(--ft-shadow-sm);
}

.peak-days__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.peak-days__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  cursor: help;
}

.peak-days__title i {
  font-size: 1rem;
  color: var(--ft-warning-400);
}

.peak-days__loading {
  display: grid;
  gap: var(--ft-space-3);
}

.peak-days__message {
  display: grid;
}

.peak-days__message-body {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
}

.peak-days__message-body p {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.peak-days__summary {
  display: grid;
  gap: var(--ft-space-1);
  padding: var(--ft-space-3);
  border-radius: var(--ft-radius-lg);
  border: 1px solid var(--ft-border-subtle);
  background: color-mix(in srgb, var(--ft-surface-raised) 60%, transparent);
  text-align: left;
  cursor: pointer;
  width: 100%;
  transition: border-color var(--ft-transition-fast);
}

.peak-days__summary:hover {
  border-color: color-mix(in srgb, var(--ft-border-strong) 50%, transparent);
}

.peak-days__summary:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500) 55%, transparent);
  outline-offset: 2px;
}

.peak-days__share-value {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: var(--ft-font-bold);
  line-height: 1;
  color: var(--ft-text-primary);
}

.peak-days__summary--good .peak-days__share-value {
  color: var(--ft-success-400);
}

.peak-days__summary--average .peak-days__share-value {
  color: var(--ft-warning-400);
}

.peak-days__summary--poor .peak-days__share-value {
  color: var(--ft-danger-400);
}

.peak-days__summary--good {
  border-color: color-mix(in srgb, var(--ft-success-400) 30%, var(--ft-border-subtle));
}

.peak-days__summary--average {
  border-color: color-mix(in srgb, var(--ft-warning-400) 30%, var(--ft-border-subtle));
}

.peak-days__summary--poor {
  border-color: color-mix(in srgb, var(--ft-danger-400) 30%, var(--ft-border-subtle));
}

.peak-days__share-text {
  font-size: var(--ft-text-base);
  color: var(--ft-text-secondary);
}

.peak-days__share-meta {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
}

.peak-days__list {
  display: grid;
  gap: var(--ft-space-2);
}

.peak-days__item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--ft-space-3);
  padding: var(--ft-space-3);
  border-radius: var(--ft-radius-lg);
  background: color-mix(in srgb, var(--ft-surface-soft) 70%, transparent);
  border: 1px solid transparent;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.peak-days__item:hover {
  background: var(--ft-surface-raised);
  border-color: var(--ft-border-subtle);
}

.peak-days__item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500) 55%, transparent);
  outline-offset: 2px;
}

.peak-days__item-date {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
  white-space: nowrap;
}

.peak-days__item-amount {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  text-align: right;
}

.peak-days__item-share {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
  white-space: nowrap;
}

.peak-days__toggle {
  border: none;
  background: transparent;
  color: var(--ft-primary-400);
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  cursor: pointer;
  padding: var(--ft-space-1) 0;
  text-align: left;
}

.peak-days__toggle:hover {
  text-decoration: underline;
}
</style>
