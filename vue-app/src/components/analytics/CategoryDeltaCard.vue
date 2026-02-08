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

const formatMoney = (value: number) =>
  value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: 0,
  });

const formatDelta = (value: number) =>
  `${value > 0 ? '+' : ''}${formatMoney(Math.abs(value))}`;

const formatPercent = (value: number | null) =>
  value == null ? '—' : `${Math.abs(value).toFixed(0)}%`;
</script>

<template>
  <Card class="analytics-card">
    <template #title>
      <div class="card-head">
        <div>
          <h3>Изменения по категориям</h3>
          <p>Сравнение с прошлым месяцем ({{ periodLabel }})</p>
        </div>
      </div>
    </template>

    <template #content>
      <div
        v-if="loading"
        class="card-loading"
      >
        <Skeleton
          v-for="index in 6"
          :key="index"
          height="20px"
          width="90%"
        />
      </div>

      <div
        v-else-if="error"
        class="card-message"
      >
        <Message
          severity="error"
          icon="pi pi-exclamation-triangle"
          :closable="false"
        >
          <div class="card-message__body">
            <p class="card-message__title">
              Не удалось загрузить сравнение категорий
            </p>
            <p class="card-message__text">
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
        class="card-message"
      >
        <Message
          severity="info"
          icon="pi pi-inbox"
          :closable="false"
        >
          <div class="card-message__body card-message__body--compact">
            <p class="card-message__title">
              Нет данных для сравнения
            </p>
            <p class="card-message__text">
              Нужен предыдущий период расходов, чтобы увидеть изменения.
            </p>
          </div>
        </Message>
      </div>

      <div
        v-else
        class="delta-card__grid"
      >
        <div class="delta-card__column">
          <p class="delta-card__title">Где траты выросли</p>
          <ul class="delta-card__list">
            <template v-if="!increased.length">
              <li class="delta-item delta-item--empty">
                Существенного роста нет
              </li>
            </template>
            <template v-else>
              <li
                v-for="item in increased"
                :key="item.id"
                class="delta-item"
              >
                <span
                  class="delta-item__color"
                  :style="{ backgroundColor: item.color }"
                />
                <div class="delta-item__body">
                  <span class="delta-item__name">{{ item.name }}</span>
                  <span class="delta-item__meta">
                    Этот месяц: {{ formatMoney(item.currentAmount) }} ·
                    Среднее 6м: {{ formatMoney(item.previousAmount) }}
                  </span>
                </div>
                <Tag severity="danger">
                  {{ formatDelta(item.deltaAmount) }} · {{ formatPercent(item.deltaPercent) }}
                </Tag>
              </li>
            </template>
          </ul>
        </div>

        <div class="delta-card__column">
          <p class="delta-card__title">Где траты снизились</p>
          <ul class="delta-card__list">
            <template v-if="!decreased.length">
              <li class="delta-item delta-item--empty">
                Существенного снижения нет
              </li>
            </template>
            <template v-else>
              <li
                v-for="item in decreased"
                :key="item.id"
                class="delta-item"
              >
                <span
                  class="delta-item__color"
                  :style="{ backgroundColor: item.color }"
                />
                <div class="delta-item__body">
                  <span class="delta-item__name">{{ item.name }}</span>
                  <span class="delta-item__meta">
                    Этот месяц: {{ formatMoney(item.currentAmount) }} ·
                    Среднее 6м: {{ formatMoney(item.previousAmount) }}
                  </span>
                </div>
                <Tag severity="success">
                  {{ formatDelta(item.deltaAmount) }} · {{ formatPercent(item.deltaPercent) }}
                </Tag>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.analytics-card {
  background: var(--ft-surface-base);
  border-radius: var(--ft-radius-2xl);
  border: 1px solid var(--ft-border-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  padding-bottom: var(--ft-space-3);
  box-shadow: var(--ft-shadow-sm);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ft-space-4);
}

.card-head h3 {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.card-head p {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-secondary);
}

.card-loading {
  display: grid;
  gap: var(--ft-space-3);
}

.card-message {
  display: grid;
}

.card-message__body {
  display: grid;
  gap: var(--ft-space-3);
}

.card-message__body--compact {
  gap: var(--ft-space-2);
}

.card-message__title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.card-message__text {
  margin: 0;
}

.delta-card__grid {
  display: grid;
  gap: var(--ft-space-4);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.delta-card__column {
  display: grid;
  gap: var(--ft-space-2);
}

.delta-card__title {
  margin: 0;
  font-size: var(--ft-text-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ft-text-tertiary);
}

.delta-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--ft-space-2);
}

.delta-item {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  justify-content: space-between;
  padding: var(--ft-space-2);
  border-radius: var(--ft-radius-lg);
  background: var(--ft-surface-soft);
}

.delta-item--empty {
  justify-content: center;
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-sm);
}

.delta-item__color {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.delta-item__body {
  display: grid;
  gap: 2px;
  flex: 1;
}

.delta-item__name {
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
}

.delta-item__meta {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

@media (max-width: 640px) {
  .card-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-head p {
    font-size: var(--ft-text-sm);
  }

  .delta-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .delta-item :deep(.p-tag) {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
