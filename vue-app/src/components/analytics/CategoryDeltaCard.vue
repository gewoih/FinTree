<script setup lang="ts">
import { computed } from 'vue';
import UiSkeleton from '@/ui/UiSkeleton.vue';
import UiMessage from '@/ui/UiMessage.vue';
import UiButton from '../../ui/UiButton.vue';

interface CategoryDeltaItem {
  id: string;
  name: string;
  color: string;
  currentAmount: number;
  previousAmount: number;
  deltaAmount: number;
  deltaPercent: number | null;
}

const props = defineProps<{
  loading: boolean;
  error: string | null;
  increased: CategoryDeltaItem[];
  decreased: CategoryDeltaItem[];
  currency: string;
  periodLabel: string;
}>();

const emit = defineEmits<{
  (event: 'retry'): void;
}>();

const showEmpty = computed(
  () =>
    !props.loading &&
    !props.error &&
    props.increased.length === 0 &&
    props.decreased.length === 0
);

const getMaxDelta = (items: CategoryDeltaItem[]) => {
  if (!items.length) return 1;
  return Math.max(...items.map(item => Math.abs(item.deltaAmount)), 1);
};

const maxIncreaseDelta = computed(() => getMaxDelta(props.increased));
const maxDecreaseDelta = computed(() => getMaxDelta(props.decreased));

const clampBarPercent = (value: number) => Math.max(4, Math.min(value, 100));

const barWidth = (item: CategoryDeltaItem, direction: 'up' | 'down') => {
  if (item.deltaPercent != null && Number.isFinite(item.deltaPercent)) {
    return `${clampBarPercent(Math.abs(item.deltaPercent))}%`;
  }

  const maxDelta = direction === 'up' ? maxIncreaseDelta.value : maxDecreaseDelta.value;
  const amountPercent = (Math.abs(item.deltaAmount) / maxDelta) * 100;
  return `${clampBarPercent(amountPercent)}%`;
};

const formatMoney = (value: number) =>
  value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: 0,
  });

const formatDelta = (value: number) =>
  `${value > 0 ? '+' : '−'}${formatMoney(Math.abs(value))}`;

const formatPercent = (value: number | null) =>
  value == null ? '' : `${Math.abs(value).toFixed(0)}%`;
</script>

<template>
  <div class="delta-card">
    <div class="delta-card__head">
      <div class="delta-card__title-row">
        <h3 class="delta-card__title">
          Изменения по категориям
        </h3>
        <i
          v-tooltip.top="'Какие категории расходов выросли или снизились по сравнению с прошлым месяцем. Помогает увидеть тренды.'"
          class="pi pi-question-circle delta-card__hint"
        />
      </div>
      <p class="delta-card__subtitle">
        Сравнение с прошлым месяцем ({{ periodLabel }})
      </p>
    </div>

    <div
      v-if="loading"
      class="delta-card__loading"
    >
      <UiSkeleton
        v-for="i in 4"
        :key="i"
        height="36px"
        width="90%"
      />
    </div>

    <div
      v-else-if="error"
      class="delta-card__message"
    >
      <UiMessage
        severity="error"
        icon="pi pi-exclamation-triangle"
        :closable="false"
      >
        <div class="delta-card__message-body">
          <p class="delta-card__message-title">
            Не удалось загрузить сравнение
          </p>
          <p class="delta-card__message-text">
            {{ error }}
          </p>
          <UiButton
            label="Повторить"
            icon="pi pi-refresh"
            size="sm"
            @click="emit('retry')"
          />
        </div>
      </UiMessage>
    </div>

    <div
      v-else-if="showEmpty"
      class="delta-card__message"
    >
      <UiMessage
        severity="info"
        icon="pi pi-inbox"
        :closable="false"
      >
        <div class="delta-card__message-body delta-card__message-body--compact">
          <p class="delta-card__message-title">
            Нет данных для сравнения
          </p>
          <p class="delta-card__message-text">
            Нужен предыдущий период расходов, чтобы увидеть изменения.
          </p>
        </div>
      </UiMessage>
    </div>

    <div
      v-else
      class="delta-card__body"
    >
      <div
        v-if="increased.length"
        class="delta-card__section"
      >
        <p class="delta-card__section-title">
          <i class="pi pi-arrow-up" />
          Рост
        </p>
        <div class="delta-card__list">
          <div
            v-for="item in increased"
            :key="item.id"
            class="delta-item"
          >
            <div class="delta-item__info">
              <span
                class="delta-item__color"
                :style="{ backgroundColor: item.color }"
              />
              <span class="delta-item__name">{{ item.name }}</span>
              <span class="delta-item__delta delta-item__delta--up">
                {{ formatDelta(item.deltaAmount) }}
                <span
                  v-if="formatPercent(item.deltaPercent)"
                  class="delta-item__pct"
                >{{ formatPercent(item.deltaPercent) }}</span>
              </span>
            </div>
            <div class="delta-item__bar-track">
              <div
                class="delta-item__bar delta-item__bar--up"
                :style="{ width: barWidth(item, 'up') }"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="decreased.length"
        class="delta-card__section"
      >
        <p class="delta-card__section-title">
          <i class="pi pi-arrow-down" />
          Снижение
        </p>
        <div class="delta-card__list">
          <div
            v-for="item in decreased"
            :key="item.id"
            class="delta-item"
          >
            <div class="delta-item__info">
              <span
                class="delta-item__color"
                :style="{ backgroundColor: item.color }"
              />
              <span class="delta-item__name">{{ item.name }}</span>
              <span class="delta-item__delta delta-item__delta--down">
                {{ formatDelta(item.deltaAmount) }}
                <span
                  v-if="formatPercent(item.deltaPercent)"
                  class="delta-item__pct"
                >{{ formatPercent(item.deltaPercent) }}</span>
              </span>
            </div>
            <div class="delta-item__bar-track">
              <div
                class="delta-item__bar delta-item__bar--down"
                :style="{ width: barWidth(item, 'down') }"
              />
            </div>
          </div>
        </div>
      </div>

      <p
        v-if="!increased.length && !decreased.length"
        class="delta-card__none"
      >
        Существенных изменений нет
      </p>
    </div>
  </div>
</template>

<style scoped>
.delta-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  padding: clamp(1rem, 2vw, 1.5rem);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-2xl);
  box-shadow: var(--ft-shadow-sm);
}

.delta-card__head {
  display: grid;
  gap: var(--ft-space-1);
}

.delta-card__title-row {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.delta-card__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.delta-card__hint {
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* Ensure minimum touch target size */
  min-width: var(--ft-control-height);
  min-height: var(--ft-control-height);

  font-size: 1rem;
  color: var(--ft-text-muted);

  transition: color var(--ft-transition-fast);
}

.delta-card__hint:hover {
  color: var(--ft-text-secondary);
}

.delta-card__hint:active {
  color: var(--ft-accent-primary);
}

.delta-card__subtitle {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.delta-card__loading {
  display: grid;
  gap: var(--ft-space-3);
}

.delta-card__message {
  display: grid;
}

.delta-card__message-body {
  display: grid;
  gap: var(--ft-space-3);
}

.delta-card__message-body--compact {
  gap: var(--ft-space-2);
}

.delta-card__message-title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.delta-card__message-text {
  margin: 0;
}

.delta-card__body {
  display: grid;
  gap: var(--ft-space-4);
}

.delta-card__section {
  display: grid;
  gap: var(--ft-space-2);
}

.delta-card__section-title {
  display: inline-flex;
  gap: var(--ft-space-1);
  align-items: center;

  margin: 0;

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.delta-card__section-title .pi-arrow-up {
  font-size: 0.7rem;
  color: var(--ft-danger-400);
}

.delta-card__section-title .pi-arrow-down {
  font-size: 0.7rem;
  color: var(--ft-success-400);
}

.delta-card__list {
  display: grid;
  gap: var(--ft-space-2);
}

.delta-item {
  display: grid;
  gap: var(--ft-space-1);
}

.delta-item__info {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.delta-item__color {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: var(--ft-radius-full);
}

.delta-item__name {
  overflow: hidden;
  flex: 1;

  min-width: 0;

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delta-item__delta {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-bold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.delta-item__delta--up {
  color: var(--ft-danger-400);
}

.delta-item__delta--down {
  color: var(--ft-success-400);
}

.delta-item__pct {
  margin-left: 2px;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  opacity: 0.7;
}

.delta-item__bar-track {
  overflow: hidden;
  height: 4px;
  background: color-mix(in srgb, var(--ft-surface-raised) 70%, transparent);
  border-radius: var(--ft-radius-full);
}

.delta-item__bar {
  height: 100%;
  border-radius: var(--ft-radius-full);
  transition: width var(--ft-transition-slow);
}

.delta-item__bar--up {
  background: var(--ft-danger-400);
}

.delta-item__bar--down {
  background: var(--ft-success-400);
}

.delta-card__none {
  margin: 0;
  padding: var(--ft-space-4);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
  text-align: center;
}
</style>
