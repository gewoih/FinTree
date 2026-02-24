<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import EvolutionKpiCard from '@/components/analytics/EvolutionKpiCard.vue'
import EvolutionMonthlyTable from '@/components/analytics/EvolutionMonthlyTable.vue'
import { useViewport } from '@/composables/useViewport'
import {
  useEvolutionTab,
  EVOLUTION_GROUPS,
  EVOLUTION_KPI_META,
  EVOLUTION_KPI_ORDER,
  type EvolutionKpiGroupId,
  type EvolutionRange,
} from '@/composables/useEvolutionTab'

const {
  state,
  error,
  selectedRange,
  visibleKpis,
  groupedChartModels,
  tableRows,
  hasTableRows,
  hasVisibleKpis,
  baseCurrencyCode,
  load,
  changeRange,
  toggleKpi,
  showAllKpis,
} = useEvolutionTab()

const { isMobile } = useViewport()

const expandedGroupIds = ref<EvolutionKpiGroupId[]>(['balance'])
const renderedGroupIds = ref<EvolutionKpiGroupId[]>(['balance'])

const RANGES: { value: EvolutionRange; label: string }[] = [
  { value: 6, label: '6 мес' },
  { value: 12, label: '12 мес' },
  { value: 0, label: 'Всё' },
]

const visibleGroups = computed(() => groupedChartModels.value.filter(group => group.cards.length > 0))
const allGroupIds = EVOLUTION_GROUPS.map(group => group.id)

watch(
  isMobile,
  mobile => {
    if (!mobile) {
      expandedGroupIds.value = [...allGroupIds]
      renderedGroupIds.value = [...allGroupIds]
      return
    }

    if (expandedGroupIds.value.length === 0) {
      expandedGroupIds.value = ['balance']
    }

    if (!renderedGroupIds.value.includes('balance')) {
      renderedGroupIds.value = [...renderedGroupIds.value, 'balance']
    }
  },
  { immediate: true }
)

onMounted(load)

function isGroupExpanded(groupId: EvolutionKpiGroupId): boolean {
  return !isMobile.value || expandedGroupIds.value.includes(groupId)
}

function isGroupRendered(groupId: EvolutionKpiGroupId): boolean {
  return !isMobile.value || renderedGroupIds.value.includes(groupId)
}

function toggleGroup(groupId: EvolutionKpiGroupId) {
  if (!isMobile.value) return

  const isExpanded = expandedGroupIds.value.includes(groupId)
  if (isExpanded) {
    expandedGroupIds.value = expandedGroupIds.value.filter(id => id !== groupId)
    return
  }

  expandedGroupIds.value = [...expandedGroupIds.value, groupId]
  if (!renderedGroupIds.value.includes(groupId)) {
    renderedGroupIds.value = [...renderedGroupIds.value, groupId]
  }
}
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

    <section class="evolution-tab__toggles">
      <p class="evolution-tab__toggles-title">
        Показатели на графиках
      </p>
      <div
        class="evolution-tab__toggle-list"
        role="group"
        aria-label="Переключение показателей"
      >
        <button
          v-for="key in EVOLUTION_KPI_ORDER"
          :key="key"
          type="button"
          class="evolution-tab__toggle-btn"
          :class="{ 'evolution-tab__toggle-btn--active': visibleKpis.includes(key) }"
          @click="toggleKpi(key)"
        >
          <span>{{ EVOLUTION_KPI_META[key].label }}</span>
          <i
            class="pi"
            :class="visibleKpis.includes(key) ? 'pi-eye' : 'pi-eye-slash'"
            aria-hidden="true"
          />
        </button>
      </div>
    </section>

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
      <Message
        v-if="!hasVisibleKpis"
        severity="info"
        icon="pi pi-eye-slash"
        :closable="false"
      >
        <div class="evolution-tab__message-body">
          <p class="evolution-tab__message-title">
            Все графики скрыты
          </p>
          <p class="evolution-tab__message-text">
            Включите хотя бы один показатель или восстановите набор по умолчанию.
          </p>
          <button
            type="button"
            class="evolution-tab__reset-btn"
            @click="showAllKpis"
          >
            Показать все
          </button>
        </div>
      </Message>

      <section
        v-for="group in visibleGroups"
        :key="group.id"
        class="evolution-group"
      >
        <button
          type="button"
          class="evolution-group__header"
          :class="{ 'evolution-group__header--collapsible': isMobile }"
          @click="toggleGroup(group.id)"
        >
          <span class="evolution-group__title">{{ group.label }}</span>
          <i
            v-if="isMobile"
            class="pi"
            :class="isGroupExpanded(group.id) ? 'pi-chevron-up' : 'pi-chevron-down'"
            aria-hidden="true"
          />
        </button>

        <div
          v-show="isGroupExpanded(group.id)"
          class="evolution-group__content"
        >
          <div class="evolution-group__grid">
            <EvolutionKpiCard
              v-for="card in group.cards"
              :key="card.key"
              :card="card"
              :currency-code="baseCurrencyCode"
              :render-chart="isGroupRendered(group.id)"
            />
          </div>
        </div>
      </section>

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

.evolution-tab__toggles {
  display: grid;
  gap: var(--ft-space-2);
}

.evolution-tab__toggles-title {
  margin: 0;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.evolution-tab__toggle-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
}

.evolution-tab__toggle-btn {
  cursor: pointer;

  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);

  background: transparent;
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);

  transition:
    color var(--ft-transition-fast),
    border-color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

.evolution-tab__toggle-btn--active {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-surface-raised) 75%, transparent);
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

.evolution-tab__reset-btn {
  cursor: pointer;

  width: fit-content;
  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-primary-400);

  background: transparent;
  border: 1px solid var(--ft-primary-400);
  border-radius: var(--ft-radius-md);
}

.evolution-group {
  display: grid;
  gap: var(--ft-space-3);
}

.evolution-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0;

  text-align: left;

  background: transparent;
  border: none;
}

.evolution-group__header--collapsible {
  cursor: pointer;

  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-3);

  background: var(--ft-surface-soft);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

.evolution-group__title {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.evolution-group__content {
  display: grid;
  gap: var(--ft-space-3);
}

.evolution-group__grid {
  display: grid;
  gap: var(--ft-space-3);
}

@media (width <= 640px) {
  .evolution-tab {
    padding: var(--ft-space-3);
  }
}
</style>
