<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Message from 'primevue/message'
import GoalFanChartCard from './GoalFanChartCard.vue'
import GoalParametersPanel from './GoalParametersPanel.vue'
import { useGoalSimulation } from '../composables/useGoalSimulation.ts'
import { apiService } from '@/services/api.service.ts'
import UiButton from '@/ui/UiButton.vue'
import type {
  GoalParameterOverrides,
  GoalSimulationParametersDto,
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
  simulate,
} = useGoalSimulation()

const overrides = ref<GoalParameterOverrides>({})
const defaultParams = ref<GoalSimulationParametersDto | null>(null)
const defaultsLoading = ref(false)
const defaultsError = ref<string | null>(null)
const baselineRequestKey = ref<string | null>(null)

const resolvedParamsForPanel = computed(() =>
  result.value?.resolvedParameters ?? defaultParams.value,
)

function roundNullable(value: number | null | undefined, digits = 6): number | null {
  if (value == null || !Number.isFinite(value))
    return null

  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function getRequestKey(request: GoalSimulationRequestDto): string {
  return JSON.stringify({
    targetAmount: Math.max(0, Math.round(request.targetAmount ?? 0)),
    initialCapital: roundNullable(request.initialCapital, 2),
    monthlyIncome: roundNullable(request.monthlyIncome, 2),
    monthlyExpenses: roundNullable(request.monthlyExpenses, 2),
    annualReturnRate: roundNullable(request.annualReturnRate, 6),
  })
}

const currentRequestKey = computed(() => getRequestKey(buildRequest()))
const hasPendingChanges = computed(() =>
  baselineRequestKey.value != null && currentRequestKey.value !== baselineRequestKey.value,
)

const canRunInitialSimulation = computed(() =>
  result.value == null && !defaultsLoading.value,
)

const canRunSimulation = computed(() =>
  Number.isFinite(props.targetAmount)
  && props.targetAmount > 0
  && !loading.value
  && (canRunInitialSimulation.value || hasPendingChanges.value),
)

async function loadDefaultParams() {
  defaultsLoading.value = true
  defaultsError.value = null

  try {
    defaultParams.value = await apiService.getGoalSimulationDefaults()
    baselineRequestKey.value = getRequestKey(buildRequest())
  }
  catch {
    defaultsError.value = 'Не удалось загрузить параметры по данным пользователя.'
    if (baselineRequestKey.value == null)
      baselineRequestKey.value = getRequestKey(buildRequest())
  }
  finally {
    defaultsLoading.value = false
  }
}

onMounted(() => {
  void loadDefaultParams()
})

function buildRequest(): GoalSimulationRequestDto {
  return {
    targetAmount: props.targetAmount,
    initialCapital: overrides.value.initialCapital ?? null,
    monthlyIncome: overrides.value.monthlyIncome ?? null,
    monthlyExpenses: overrides.value.monthlyExpenses ?? null,
    annualReturnRate: overrides.value.annualReturnRate ?? null,
  }
}

async function runSimulation() {
  if (!canRunSimulation.value)
    return

  const request = buildRequest()
  const requestKey = getRequestKey(request)
  await simulate(request)

  if (!error.value)
    baselineRequestKey.value = requestKey
}

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
}

const targetAmountLabel = computed(() =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: props.currencyCode,
    maximumFractionDigits: 0,
  }).format(props.targetAmount),
)

const dataQuality = computed(() => {
  const score = result.value?.dataQualityScore
  if (!Number.isFinite(score))
    return null

  if (score >= 0.95) {
    return {
      score,
      tone: 'high' as const,
      label: 'Высокое качество данных',
      description: 'Истории операций достаточно для более стабильной симуляции.',
    }
  }

  if (score >= 0.85) {
    return {
      score,
      tone: 'medium' as const,
      label: 'Среднее качество данных',
      description: 'Прогноз может заметно меняться по мере накопления новой истории.',
    }
  }

  return {
    score,
    tone: 'low' as const,
    label: 'Низкое качество данных',
    description: 'Истории пока мало, результат симуляции ориентировочный.',
  }
})

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

    <GoalParametersPanel
      v-if="resolvedParamsForPanel"
      :resolved-params="resolvedParamsForPanel"
      :model-value="overrides"
      @update:model-value="onOverridesChange"
    />

    <Message
      v-else-if="defaultsLoading"
      severity="info"
    >
      Загружаем ориентиры по данным пользователя…
    </Message>

    <Message
      v-else-if="defaultsError"
      severity="warn"
    >
      {{ defaultsError }}
    </Message>

    <div class="goal-detail__actions">
      <UiButton
        label="Пересчитать прогноз"
        :disabled="!canRunSimulation"
        :loading="loading"
        variant="primary"
        @click="runSimulation"
      />
    </div>

    <Message
      v-if="targetAmount > 0 && !loading && !result && !error && !defaultsLoading && !defaultsError"
      severity="info"
    >
      Нажмите «Пересчитать прогноз», чтобы запустить симуляцию.
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
          диапазон P25–P75
        </div>
      </div>
    </div>

    <GoalFanChartCard
      :loading="loading"
      :result="result"
      :target-amount="targetAmount"
      :currency-code="currencyCode"
    />

    <div
      v-if="targetAmount > 0 && result && dataQuality"
      class="data-quality"
      :class="`data-quality--${dataQuality.tone}`"
    >
      <div class="data-quality__row">
        <span class="data-quality__label">{{ dataQuality.label }}</span>
        <strong class="data-quality__score">{{ Math.round(dataQuality.score * 100) }}%</strong>
      </div>
      <p class="data-quality__description">
        {{ dataQuality.description }}
      </p>
    </div>
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

.goal-detail__actions {
  display: flex;
  justify-content: flex-start;
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

.data-quality {
  padding: var(--ft-space-3) var(--ft-space-4);
  border: 1px solid transparent;
  border-radius: var(--ft-radius-md);
  background: color-mix(in srgb, var(--ft-surface-raised) 85%, transparent);
}

.data-quality__row {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;
}

.data-quality__label {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.data-quality__score {
  font-size: var(--ft-text-sm);
  font-variant-numeric: tabular-nums;
}

.data-quality__description {
  margin: var(--ft-space-2) 0 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);
}

.data-quality--high {
  border-color: color-mix(in srgb, var(--ft-success-500) 45%, transparent);
}

.data-quality--high .data-quality__score {
  color: var(--ft-success-500);
}

.data-quality--medium {
  border-color: color-mix(in srgb, var(--ft-warning-500) 45%, transparent);
}

.data-quality--medium .data-quality__score {
  color: var(--ft-warning-500);
}

.data-quality--low {
  border-color: color-mix(in srgb, var(--ft-danger-500) 45%, transparent);
}

.data-quality--low .data-quality__score {
  color: var(--ft-danger-500);
}

@media (width <= 768px) {
  .goal-kpis {
    gap: var(--ft-space-4);
  }
}
</style>
