<script setup lang="ts">
import { computed } from 'vue';

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

const maxDelta = computed(() => {
  const all = [...props.increased, ...props.decreased];
  if (!all.length) return 1;
  return Math.max(...all.map(i => Math.abs(i.deltaAmount)), 1);
});

const barWidth = (item: CategoryDeltaItem) => {
  const pct = (Math.abs(item.deltaAmount) / maxDelta.value) * 100;
  return `${Math.max(pct, 4)}%`;
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
      <h3
        v-tooltip.top="'Какие категории расходов выросли или снизились по сравнению с прошлым месяцем. Помогает увидеть тренды.'"
        class="delta-card__title"
      >
        Изменения по категориям
      </h3>
      <p class="delta-card__subtitle">
        Сравнение с прошлым месяцем ({{ periodLabel }})
      </p>
    </div>

    <div
      v-if="loading"
      class="delta-card__loading"
    >
      <Skeleton
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
      <Message
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
      class="delta-card__message"
    >
      <Message
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
      </Message>
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
                :style="{ width: barWidth(item) }"
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
                :style="{ width: barWidth(item) }"
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

.delta-card__title {
  cursor: help;

  margin: 0;

  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
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
  border-radius: 999px;
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
  border-radius: 999px;
}

.delta-item__bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
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
