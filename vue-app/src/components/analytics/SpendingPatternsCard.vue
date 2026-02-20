<script setup lang="ts">
import { computed } from 'vue';
import UiCard from '@/ui/UiCard.vue';
import UiSkeleton from '@/ui/UiSkeleton.vue';
import UiMessage from '@/ui/UiMessage.vue';
import UiButton from '../../ui/UiButton.vue';

interface PeakDayItem {
  label: string;
  amount: number;
}

const props = defineProps<{
  loading: boolean;
  error: string | null;
  empty: boolean;
  peaks: PeakDayItem[];
  spikeCount: number | null;
  medianDaily: number | null;
  currency: string;
  monthLabel: string;
}>();

const emit = defineEmits<{
  (event: 'retry'): void;
}>();

const showEmpty = computed(
  () =>
    !props.loading &&
    !props.error &&
    (props.empty || props.peaks.length === 0)
);

const formatMoney = (value: number | null) => {
  if (value == null) return '—';
  return value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: 0,
  });
};

const spikeLabel = computed(() => (props.spikeCount == null ? '—' : props.spikeCount.toString()));
</script>

<template>
  <UiCard class="analytics-card">
    <template #header>
      <div class="card-head">
        <div>
          <h3>Пиковые дни</h3>
          <p>Самые дорогие дни в {{ monthLabel || 'выбранном месяце' }}</p>
        </div>
      </div>
    </template>

    <template #default>
      <div
        v-if="loading"
        class="card-loading"
      >
        <UiSkeleton
          v-for="index in 4"
          :key="index"
          height="24px"
          width="90%"
        />
      </div>

      <div
        v-else-if="error"
        class="card-message"
      >
        <UiMessage
          severity="error"
          icon="pi pi-exclamation-triangle"
          :closable="false"
        >
          <div class="card-message__body">
            <p class="card-message__title">
              Не удалось загрузить паттерны расходов
            </p>
            <p class="card-message__text">
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
        class="card-message"
      >
        <UiMessage
          severity="info"
          icon="pi pi-inbox"
          :closable="false"
        >
          <div class="card-message__body card-message__body--compact">
            <p class="card-message__title">
              Недостаточно данных
            </p>
            <p class="card-message__text">
              Добавьте ежедневные траты, чтобы увидеть пиковые дни.
            </p>
          </div>
        </UiMessage>
      </div>

      <div
        v-else
        class="patterns-card__body"
      >
        <div class="patterns-card__stats">
          <div class="patterns-card__stat">
            <span class="patterns-card__label">Всплесков</span>
            <strong>{{ spikeLabel }}</strong>
          </div>
          <div class="patterns-card__stat">
            <span class="patterns-card__label">Медиана дня</span>
            <strong>{{ formatMoney(medianDaily) }}</strong>
          </div>
        </div>
        <ul class="patterns-card__list">
          <li
            v-for="item in peaks"
            :key="item.label"
            class="patterns-card__item"
          >
            <span class="patterns-card__date">{{ item.label }}</span>
            <span class="patterns-card__amount">{{ formatMoney(item.amount) }}</span>
          </li>
        </ul>
      </div>
    </template>
  </UiCard>
</template>

<style scoped>
.analytics-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  padding-bottom: var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-xl);
  box-shadow: var(--ft-shadow-sm);
}

.card-head {
  display: flex;
  gap: var(--ft-space-4);
  align-items: flex-start;
  justify-content: space-between;
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

.patterns-card__body {
  display: grid;
  gap: var(--ft-space-4);
}

.patterns-card__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--ft-space-3);
}

.patterns-card__stat {
  display: grid;
  gap: var(--ft-space-1);

  padding: var(--ft-space-2);

  background: var(--ft-surface-soft);
  border-radius: var(--ft-radius-lg);
}

.patterns-card__label {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.patterns-card__list {
  display: grid;
  gap: var(--ft-space-2);

  margin: 0;
  padding: 0;

  list-style: none;
}

.patterns-card__item {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: var(--ft-space-2);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);
}

.patterns-card__date {
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
}

.patterns-card__amount {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}
</style>
