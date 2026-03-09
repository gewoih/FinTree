<script setup lang="ts">
import { computed } from 'vue'
import InputNumber from 'primevue/inputnumber'
import Slider from 'primevue/slider'
import ToggleSwitch from 'primevue/toggleswitch'
import type { FreedomCalculatorDefaultsDto, FreedomCalculatorRequestDto } from '@/types.ts'

const props = defineProps<{
  modelValue: FreedomCalculatorRequestDto
  defaults: FreedomCalculatorDefaultsDto | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FreedomCalculatorRequestDto]
}>()

function update(patch: Partial<FreedomCalculatorRequestDto>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const isCapitalAuto = computed(() =>
  props.defaults != null && Math.abs(props.modelValue.capital - props.defaults.capital) < 1,
)
const isExpensesAuto = computed(() =>
  props.defaults != null && Math.abs(props.modelValue.monthlyExpenses - props.defaults.monthlyExpenses) < 1,
)

function resetCapital() {
  if (props.defaults)
    update({ capital: props.defaults.capital })
}
function resetExpenses() {
  if (props.defaults)
    update({ monthlyExpenses: props.defaults.monthlyExpenses })
}

const CAPITAL_CHIPS = [1_000_000, 3_000_000, 5_000_000, 10_000_000]
const EXPENSES_CHIPS = [50_000, 100_000, 150_000, 200_000]
const SWR_CHIPS = [3, 3.5, 4, 4.5]
const INFLATION_CHIPS = [3, 5, 7, 10]

function formatChipCapital(v: number): string {
  if (v >= 1_000_000)
    return `${v / 1_000_000} млн`
  return `${v / 1_000}k`
}
function formatChipExpenses(v: number): string {
  return `${v / 1_000}k`
}


</script>

<template>
  <div class="params-panel">
    <!-- Капитал / накопления -->
    <div class="param-row">
      <div class="param-label">
        <span>Капитал / накопления</span>
        <span
          v-if="isCapitalAuto && defaults"
          class="param-badge param-badge--auto"
        >авто</span>
        <button
          v-else-if="defaults && !isCapitalAuto"
          type="button"
          class="param-reset"
          aria-label="Сбросить капитал к значению из аналитики"
          @click="resetCapital"
        >
          сбросить
        </button>
      </div>
      <InputNumber
        :model-value="modelValue.capital"
        :min="0"
        :max="50_000_000"
        :max-fraction-digits="0"
        locale="ru-RU"
        fluid
        @update:model-value="(v) => update({ capital: v ?? 0 })"
      />
      <Slider
        :model-value="modelValue.capital"
        :min="0"
        :max="50_000_000"
        :step="100_000"
        class="param-slider"
        @update:model-value="(v) => update({ capital: v as number })"
      />
      <div class="param-chips">
        <button
          v-for="chip in CAPITAL_CHIPS"
          :key="chip"
          type="button"
          class="param-chip"
          :class="{ 'param-chip--active': modelValue.capital === chip }"
          @click="update({ capital: chip })"
        >
          {{ formatChipCapital(chip) }}
        </button>
      </div>
    </div>

    <!-- Расходы в месяц -->
    <div class="param-row">
      <div class="param-label">
        <span>Расходы в месяц</span>
        <span
          v-if="isExpensesAuto && defaults"
          class="param-badge param-badge--auto"
        >авто</span>
        <button
          v-else-if="defaults && !isExpensesAuto"
          type="button"
          class="param-reset"
          aria-label="Сбросить расходы к значению из аналитики"
          @click="resetExpenses"
        >
          сбросить
        </button>
      </div>
      <InputNumber
        :model-value="modelValue.monthlyExpenses"
        :min="0"
        :max="500_000"
        :max-fraction-digits="0"
        locale="ru-RU"
        fluid
        @update:model-value="(v) => update({ monthlyExpenses: v ?? 0 })"
      />
      <Slider
        :model-value="modelValue.monthlyExpenses"
        :min="0"
        :max="500_000"
        :step="1_000"
        class="param-slider"
        @update:model-value="(v) => update({ monthlyExpenses: v as number })"
      />
      <div class="param-chips">
        <button
          v-for="chip in EXPENSES_CHIPS"
          :key="chip"
          type="button"
          class="param-chip"
          :class="{ 'param-chip--active': modelValue.monthlyExpenses === chip }"
          @click="update({ monthlyExpenses: chip })"
        >
          {{ formatChipExpenses(chip) }}
        </button>
      </div>
    </div>

    <!-- Безопасная ставка изъятия -->
    <div class="param-row">
      <div class="param-label">
        <span>Безопасная ставка изъятия</span>
      </div>
      <InputNumber
        :model-value="modelValue.swrPercent"
        :min="1"
        :max="10"
        :min-fraction-digits="1"
        :max-fraction-digits="1"
        suffix=" %"
        locale="ru-RU"
        fluid
        @update:model-value="(v) => update({ swrPercent: v ?? 4 })"
      />
      <Slider
        :model-value="modelValue.swrPercent"
        :min="1"
        :max="10"
        :step="0.1"
        class="param-slider"
        @update:model-value="(v) => update({ swrPercent: v as number })"
      />
      <div class="param-chips">
        <button
          v-for="chip in SWR_CHIPS"
          :key="chip"
          type="button"
          class="param-chip"
          :class="{ 'param-chip--active': modelValue.swrPercent === chip }"
          @click="update({ swrPercent: chip })"
        >
          {{ chip }}%
        </button>
      </div>
    </div>

    <!-- Личная инфляция -->
    <div class="param-row">
      <div class="param-label param-label--toggle">
        <ToggleSwitch
          :model-value="modelValue.inflationEnabled"
          input-id="inflation-toggle"
          @update:model-value="(v) => update({ inflationEnabled: v })"
        />
        <label
          for="inflation-toggle"
          class="param-label__toggle-text"
        >
          Учитывать инфляцию в расходах
        </label>
      </div>
      <template v-if="modelValue.inflationEnabled">
        <InputNumber
          :model-value="modelValue.inflationRatePercent"
          :min="0"
          :max="20"
          :min-fraction-digits="1"
          :max-fraction-digits="1"
          suffix=" %"
          locale="ru-RU"
          fluid
          @update:model-value="(v) => update({ inflationRatePercent: v ?? 5 })"
        />
        <Slider
          :model-value="modelValue.inflationRatePercent"
          :min="0"
          :max="20"
          :step="0.5"
          class="param-slider"
          @update:model-value="(v) => update({ inflationRatePercent: v as number })"
        />
        <div class="param-chips">
          <button
            v-for="chip in INFLATION_CHIPS"
            :key="chip"
            type="button"
            class="param-chip"
            :class="{ 'param-chip--active': modelValue.inflationRatePercent === chip }"
            @click="update({ inflationRatePercent: chip })"
          >
            {{ chip }}%
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.params-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
  padding: var(--ft-space-2);
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
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
}

.param-label--toggle {
  flex-wrap: nowrap;
}

.param-label__toggle-text {
  cursor: pointer;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
}

.param-badge {
  padding: 1px 6px;

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;

  border-radius: var(--ft-radius-sm);
}

.param-badge--auto {
  color: var(--ft-success-500);
  background: color-mix(in srgb, var(--ft-success-500) 15%, transparent);
}

.param-reset {
  cursor: pointer;

  padding: 1px 6px;

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-warning-500);
  text-transform: uppercase;
  letter-spacing: 0.03em;

  background: color-mix(in srgb, var(--ft-warning-500) 15%, transparent);
  border: none;
  border-radius: var(--ft-radius-sm);
}

.param-reset:hover {
  background: color-mix(in srgb, var(--ft-warning-500) 25%, transparent);
}

.param-reset:focus-visible {
  outline: 2px solid var(--ft-primary-400);
  outline-offset: 2px;
}

.param-slider {
  margin: var(--ft-space-1) 0;
}

.param-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
}

.param-chip {
  cursor: pointer;

  padding: var(--ft-space-1) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);

  background: var(--ft-surface-overlay);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);

  transition:
    color var(--ft-transition-fast),
    background var(--ft-transition-fast),
    border-color var(--ft-transition-fast);
}

.param-chip:hover {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-primary-500) 10%, transparent);
  border-color: var(--ft-primary-400);
}

.param-chip--active {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-primary-400);
  background: color-mix(in srgb, var(--ft-primary-500) 15%, transparent);
  border-color: var(--ft-primary-400);
}

.param-chip:focus-visible {
  outline: 2px solid var(--ft-primary-400);
  outline-offset: 2px;
}
</style>
