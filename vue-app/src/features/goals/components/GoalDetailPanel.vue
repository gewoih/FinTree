<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Message from 'primevue/message'
import GoalFanChartCard from './GoalFanChartCard.vue'
import GoalParametersPanel from './GoalParametersPanel.vue'
import { useGoalSimulation } from '../composables/useGoalSimulation.ts'
import type {
  GoalParameterOverrides,
  GoalSimulationRequestDto,
} from '@/types.ts'

const props = defineProps<{
  targetAmount: number
  currencyCode: string
}>()

const {
  result,
  loading,
  error,
  simulateDebounced,
  reset,
} = useGoalSimulation()

const overrides = ref<GoalParameterOverrides>({})

function buildRequest(): GoalSimulationRequestDto {
  return {
    targetAmount: props.targetAmount,
    initialCapital: overrides.value.initialCapital ?? null,
    monthlyIncome: overrides.value.monthlyIncome ?? null,
    monthlyExpenses: overrides.value.monthlyExpenses ?? null,
    annualReturnRate: overrides.value.annualReturnRate ?? null,
  }
}

function runSimulation(debounce = false) {
  if (!Number.isFinite(props.targetAmount) || props.targetAmount <= 0)
    return

  const request = buildRequest()
  if (debounce) {
    simulateDebounced(request)
    return
  }

  simulateDebounced(request, 0)
}

watch(
  () => props.targetAmount,
  () => {
    reset()
    runSimulation(true)
  },
  { immediate: true },
)

function areOverridesEqual(a: GoalParameterOverrides, b: GoalParameterOverrides): boolean {
  return (a.initialCapital ?? null) === (b.initialCapital ?? null)
    && (a.monthlyIncome ?? null) === (b.monthlyIncome ?? null)
    && (a.monthlyExpenses ?? null) === (b.monthlyExpenses ?? null)
    && (a.annualReturnRate ?? null) === (b.annualReturnRate ?? null)
}

function onOverridesChange(newOverrides: GoalParameterOverrides) {
  if (areOverridesEqual(overrides.value, newOverrides))
    return

  overrides.value = { ...newOverrides }
  runSimulation(true)
}

const targetAmountLabel = computed(() =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: props.currencyCode,
    maximumFractionDigits: 0,
  }).format(props.targetAmount),
)

function formatDate(monthsFromNow: number): string {
  if (monthsFromNow < 0)
    return '—'

  if (monthsFromNow === 0)
    return 'сейчас'

  const date = new Date()
  date.setMonth(date.getMonth() + monthsFromNow)

  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="goal-detail">
    <div class="goal-detail__header">
      <h2 class="goal-detail__name">
        Прогноз достижения
      </h2>
      <span class="goal-detail__target">{{ targetAmountLabel }}</span>
    </div>

    <Message
      v-if="targetAmount <= 0"
      severity="warn"
    >
      Укажите целевую сумму больше нуля.
    </Message>

    <Message
      v-else-if="error"
      severity="error"
    >
      {{ error }}
    </Message>

    <Message
      v-if="targetAmount > 0 && result && !result.isAchievable"
      severity="warn"
    >
      При текущих параметрах цель недостижима: расходы превышают доходы.
    </Message>

    <div
      v-if="targetAmount > 0 && result && result.isAchievable"
      class="goal-kpis"
    >
      <div class="kpi kpi--primary">
        <div class="kpi__value">
          {{ formatDate(result.medianMonths) }}
        </div>
        <div class="kpi__label">
          медианный срок достижения
        </div>
      </div>

      <div class="kpi kpi--secondary">
        <div class="kpi__value">
          {{ Math.round(result.probability * 100) }}%
        </div>
        <div class="kpi__label">
          вероятность достижения
        </div>
      </div>

      <div class="kpi kpi--secondary">
        <div class="kpi__value">
          {{ formatDate(result.p25Months) }} — {{ formatDate(result.p75Months) }}
        </div>
        <div class="kpi__label">
          оптимистичный — консервативный
        </div>
      </div>
    </div>

    <GoalFanChartCard
      :loading="loading"
      :result="result"
      :target-amount="targetAmount"
      :currency-code="currencyCode"
    />

    <GoalParametersPanel
      :resolved-params="result?.resolvedParameters ?? null"
      :model-value="overrides"
      @update:model-value="onOverridesChange"
    />
  </div>
</template>

<style scoped>
.goal-detail {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
}

.goal-detail__header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
  align-items: baseline;
}

.goal-detail__name {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
}

.goal-detail__target {
  font-size: var(--ft-text-base);
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-secondary);
}

.goal-kpis {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-8);
}

.kpi {
  display: grid;
  gap: var(--ft-space-1);
}

.kpi__value {
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-primary);
}

.kpi__label {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kpi--primary .kpi__value {
  font-size: clamp(1.6rem, 2.2vw, 2rem);
  color: var(--ft-primary-300);
}

.kpi--secondary .kpi__value {
  font-size: var(--ft-text-lg);
  color: var(--ft-text-secondary);
}

.kpi--secondary .kpi__label {
  color: var(--ft-text-tertiary);
}

@media (width <= 768px) {
  .goal-kpis {
    gap: var(--ft-space-4);
  }
}
</style>
