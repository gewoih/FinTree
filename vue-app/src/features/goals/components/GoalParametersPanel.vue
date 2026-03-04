<script setup lang="ts">
import { reactive, watch } from 'vue'
import InputNumber from 'primevue/inputnumber'
import type { GoalParameterOverrides, GoalSimulationParametersDto } from '@/types.ts'

type OverrideField = keyof GoalParameterOverrides

type ParameterField = {
  key: OverrideField
  label: string
  hint: string
  isPercent: boolean
  min: number
  max: number
}

const props = defineProps<{
  resolvedParams: GoalSimulationParametersDto | null
  modelValue: GoalParameterOverrides
}>()

const emit = defineEmits<{
  'update:modelValue': [overrides: GoalParameterOverrides]
}>()

const overrides = reactive<GoalParameterOverrides>({ ...props.modelValue })

watch(
  () => props.modelValue,
  value => {
    Object.assign(overrides, value)
  },
  { deep: true },
)

const fields: ParameterField[] = [
  {
    key: 'initialCapital',
    label: 'Начальный капитал',
    hint: '',
    isPercent: false,
    min: 0,
    max: 1_000_000_000_000,
  },
  {
    key: 'monthlyIncome',
    label: 'Ежемесячный доход',
    hint: '/мес',
    isPercent: false,
    min: 0,
    max: 1_000_000_000,
  },
  {
    key: 'monthlyExpenses',
    label: 'Ежемесячные расходы',
    hint: '/мес',
    isPercent: false,
    min: 0,
    max: 1_000_000_000,
  },
  {
    key: 'annualReturnRate',
    label: 'Доходность инвестиций',
    hint: '/год',
    isPercent: true,
    min: 0,
    max: 100,
  },
]

function isOverridden(field: OverrideField): boolean {
  return overrides[field] != null
}

function getResolvedValue(field: OverrideField): number {
  if (!props.resolvedParams)
    return 0

  switch (field) {
    case 'initialCapital':
      return props.resolvedParams.initialCapital
    case 'monthlyIncome':
      return props.resolvedParams.monthlyIncome
    case 'monthlyExpenses':
      return props.resolvedParams.monthlyExpenses
    case 'annualReturnRate':
      return props.resolvedParams.annualReturnRate
    default:
      return 0
  }
}

function getDisplayValue(field: ParameterField): number {
  const rawValue = overrides[field.key] ?? getResolvedValue(field.key)
  return field.isPercent ? rawValue * 100 : rawValue
}

function onFieldChange(field: ParameterField, value: number | null) {
  const normalizedValue =
    value == null
      ? null
      : field.isPercent
        ? value / 100
        : value

  overrides[field.key] = normalizedValue
  emit('update:modelValue', { ...overrides })
}

function resetField(field: OverrideField) {
  overrides[field] = null
  emit('update:modelValue', { ...overrides })
}
</script>

<template>
  <div class="params-panel">
    <div
      v-for="field in fields"
      :key="field.key"
      class="param-row"
    >
      <div class="param-label">
        <span>{{ field.label }}</span>
        <span
          v-if="field.hint"
          class="param-hint"
        >{{ field.hint }}</span>
        <span
          v-if="!isOverridden(field.key)"
          class="badge badge--auto"
        >авто</span>
        <button
          v-else
          type="button"
          class="reset-btn"
          :aria-label="`Сбросить параметр ${field.label}`"
          @click="resetField(field.key)"
        >
          сбросить
        </button>
      </div>

      <InputNumber
        :model-value="getDisplayValue(field)"
        :min="field.min"
        :max="field.max"
        :min-fraction-digits="field.isPercent ? 1 : 0"
        :max-fraction-digits="field.isPercent ? 1 : 0"
        :suffix="field.isPercent ? '%' : ''"
        locale="ru-RU"
        fluid
        @update:model-value="(value) => onFieldChange(field, value)"
      />
    </div>
  </div>
</template>

<style scoped>
.params-panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--ft-space-4);
}

.param-row {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.param-label {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
  align-items: center;

  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.param-hint {
  color: var(--ft-text-tertiary);
}

.badge {
  padding: 1px 5px;

  font-size: var(--ft-text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;

  border-radius: var(--ft-radius-sm);
}

.badge--auto {
  color: var(--ft-success-500);
  background: color-mix(in srgb, var(--ft-success-500) 15%, transparent);
}

.reset-btn {
  cursor: pointer;

  padding: 0;

  font-size: var(--ft-text-xs);
  font-weight: 600;
  color: var(--ft-warning-500);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-decoration: none;

  background: color-mix(in srgb, var(--ft-warning-500) 15%, transparent);
  border: none;
  border-radius: var(--ft-radius-sm);
  padding: 1px 5px;
}

.reset-btn:hover {
  background: color-mix(in srgb, var(--ft-warning-500) 25%, transparent);
}

.reset-btn:focus-visible {
  outline: 2px solid var(--ft-primary-400);
  outline-offset: 2px;
}

@media (width <= 900px) {
  .params-panel {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (width <= 540px) {
  .params-panel {
    grid-template-columns: 1fr;
  }
}
</style>
