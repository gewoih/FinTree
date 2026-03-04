<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Message from 'primevue/message'
import GoalFanChartCard from './GoalFanChartCard.vue'
import GoalInsightsPanel from './GoalInsightsPanel.vue'
import GoalParametersPanel from './GoalParametersPanel.vue'
import { useGoalSimulation } from '../composables/useGoalSimulation.ts'
import type {
  GoalDto,
  GoalParameterOverrides,
  GoalSimulationRequestDto,
} from '@/types.ts'

const props = defineProps<{ goal: GoalDto }>()

const {
  result,
  loading,
  error,
  simulateDebounced,
  reset,
} = useGoalSimulation()

function parseOverrides(rawJson: string | null): GoalParameterOverrides {
  if (!rawJson)
    return {}

  try {
    const parsed = JSON.parse(rawJson) as GoalParameterOverrides
    return {
      initialCapital: parsed.initialCapital ?? null,
      monthlyIncome: parsed.monthlyIncome ?? null,
      monthlyExpenses: parsed.monthlyExpenses ?? null,
      annualReturnRate: parsed.annualReturnRate ?? null,
    }
  }
  catch {
    return {}
  }
}

const storedOverrides = computed(() => parseOverrides(props.goal.parameterOverridesJson))
const overrides = ref<GoalParameterOverrides>({})

function buildRequest(): GoalSimulationRequestDto {
  return {
    initialCapital: overrides.value.initialCapital ?? null,
    monthlyIncome: overrides.value.monthlyIncome ?? null,
    monthlyExpenses: overrides.value.monthlyExpenses ?? null,
    annualReturnRate: overrides.value.annualReturnRate ?? null,
    horizonMonths: null,
  }
}

function runSimulation(debounce = false) {
  const request = buildRequest()
  if (debounce) {
    simulateDebounced(props.goal.id, request)
    return
  }

  simulateDebounced(props.goal.id, request, 0)
}

watch(
  () => props.goal.id,
  () => {
    overrides.value = { ...storedOverrides.value }
    reset()
    runSimulation()
  },
  { immediate: true },
)

watch(
  () => props.goal.parameterOverridesJson,
  rawValue => {
    overrides.value = { ...parseOverrides(rawValue) }
  },
)

function onOverridesChange(newOverrides: GoalParameterOverrides) {
  overrides.value = { ...newOverrides }
  runSimulation(true)
}

const targetAmountLabel = computed(() =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: props.goal.currencyCode,
    maximumFractionDigits: 0,
  }).format(props.goal.targetAmount),
)

function formatDate(monthsFromNow: number): string {
  if (monthsFromNow <= 0)
    return '—'

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
        {{ goal.name }}
      </h2>
      <span class="goal-detail__target">{{ targetAmountLabel }}</span>
    </div>

    <Message
      v-if="error"
      severity="error"
    >
      {{ error }}
    </Message>

    <Message
      v-if="result && !result.isAchievable"
      severity="warn"
    >
      При текущих параметрах цель недостижима: расходы превышают доходы.
    </Message>

    <div
      v-if="result && result.isAchievable"
      class="goal-kpis"
    >
      <div class="kpi">
        <div class="kpi__value">
          {{ Math.round(result.probability * 100) }}%
        </div>
        <div class="kpi__label">
          вероятность
        </div>
      </div>

      <div class="kpi">
        <div class="kpi__value">
          {{ formatDate(result.medianMonths) }}
        </div>
        <div class="kpi__label">
          медианный срок
        </div>
      </div>

      <div class="kpi">
        <div class="kpi__value">
          {{ formatDate(result.p25Months) }} — {{ formatDate(result.p75Months) }}
        </div>
        <div class="kpi__label">
          диапазон P25–P75
        </div>
      </div>
    </div>

    <GoalFanChartCard
      :loading="loading"
      :result="result"
      :target-amount="goal.targetAmount"
      :currency-code="goal.currencyCode"
    />

    <GoalParametersPanel
      :resolved-params="result?.resolvedParameters ?? null"
      :model-value="overrides"
      @update:model-value="onOverridesChange"
    />

    <GoalInsightsPanel
      v-if="result?.insights?.length"
      :insights="result.insights"
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

@media (width <= 768px) {
  .goal-kpis {
    gap: var(--ft-space-4);
  }
}
</style>
