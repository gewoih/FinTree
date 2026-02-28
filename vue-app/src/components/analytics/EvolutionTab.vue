<script setup lang="ts">
import { onMounted } from 'vue'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import EvolutionKpiCard from '@/components/analytics/EvolutionKpiCard.vue'
import EvolutionMonthlyTable from '@/components/analytics/EvolutionMonthlyTable.vue'
import {
  useEvolutionTab,
  type EvolutionRange,
} from '@/composables/useEvolutionTab'

const {
  state,
  error,
  selectedRange,
  heroCard,
  kpiCards,
  tableRows,
  hasTableRows,
  baseCurrencyCode,
  load,
  changeRange,
} = useEvolutionTab()

const RANGES: { value: EvolutionRange; label: string }[] = [
  { value: 6, label: '6 мес' },
  { value: 12, label: '12 мес' },
  { value: 0, label: 'Всё' },
]

onMounted(load)
</script>

<template>
  <div class="evolution-tab">
    <div
      class="evolution-tab__ranges"
      role="group"
      aria-label="Период"
    >
      <button
        v-for="range in RANGES"
        :key="range.value"
        type="button"
        class="evolution-tab__range-btn"
        :class="{ 'evolution-tab__range-btn--active': selectedRange === range.value }"
        @click="changeRange(range.value)"
      >
        {{ range.label }}
      </button>
    </div>

    <div
      v-if="state === 'loading'"
      class="evolution-tab__loading"
      role="status"
      aria-live="polite"
    >
      <Skeleton
        v-for="index in 3"
        :key="index"
        width="100%"
        height="220px"
        border-radius="16px"
      />
    </div>

    <Message
      v-else-if="state === 'error'"
      severity="error"
      icon="pi pi-exclamation-triangle"
      :closable="false"
    >
      <div class="evolution-tab__message-body">
        <p class="evolution-tab__message-title">
          Не удалось загрузить динамику
        </p>
        <p class="evolution-tab__message-text">
          {{ error }}
        </p>
      </div>
    </Message>

    <Message
      v-else-if="state === 'empty'"
      severity="info"
      icon="pi pi-inbox"
      :closable="false"
    >
      <div class="evolution-tab__message-body evolution-tab__message-body--compact">
        <p class="evolution-tab__message-title">
          Нет данных за выбранный период
        </p>
        <p class="evolution-tab__message-text">
          Добавьте операции, чтобы построить динамику.
        </p>
      </div>
    </Message>

    <template v-else>
      <EvolutionKpiCard
        :card="heroCard"
        :currency-code="baseCurrencyCode"
        hero
      />

      <div class="evolution-grid">
        <EvolutionKpiCard
          v-for="card in kpiCards"
          :key="card.key"
          :card="card"
          :currency-code="baseCurrencyCode"
        />
      </div>

      <EvolutionMonthlyTable
        :rows="tableRows"
        :selected-range="selectedRange"
        :has-rows="hasTableRows"
      />
    </template>
  </div>
</template>

<style scoped>
.evolution-tab {
  display: grid;
  gap: var(--ft-space-4);

  padding: var(--ft-space-4);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-xl);
  box-shadow: var(--ft-shadow-sm);
}

.evolution-tab__ranges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
}

.evolution-tab__range-btn {
  cursor: pointer;

  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-4);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);

  background: transparent;
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);

  transition:
    color var(--ft-transition-fast),
    border-color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

.evolution-tab__range-btn:hover {
  color: var(--ft-text-primary);
}

.evolution-tab__range-btn--active {
  color: var(--ft-primary-400);
  background: color-mix(in srgb, var(--ft-primary-400) 12%, transparent);
  border-color: var(--ft-primary-400);
}

.evolution-tab__loading {
  display: grid;
  gap: var(--ft-space-3);
}

.evolution-tab__message-body {
  display: grid;
  gap: var(--ft-space-2);
}

.evolution-tab__message-body--compact {
  gap: var(--ft-space-1);
}

.evolution-tab__message-title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.evolution-tab__message-text {
  margin: 0;
}

.evolution-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ft-space-3);
}

.evolution-grid > :last-child:nth-child(odd) {
  grid-column: 1 / -1;
}

@media (width <= 640px) {
  .evolution-tab {
    padding: var(--ft-space-3);
  }

  .evolution-grid {
    grid-template-columns: 1fr;
  }

  .evolution-grid > :last-child:nth-child(odd) {
    grid-column: auto;
  }
}
</style>
