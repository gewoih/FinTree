<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import SelectButton from 'primevue/selectbutton';
import type { SelectButtonPassThroughOptions } from 'primevue/selectbutton';
import { mergePt } from './prime/pt';

const props = defineProps<{
  modelValue?: unknown;
  options?: unknown[];
  optionLabel?: string;
  optionValue?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  multiple?: boolean;
  unstyled?: boolean;
  pt?: SelectButtonPassThroughOptions;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void;
  (e: 'change', event: unknown): void;
}>();

const attrs = useAttrs();

const mergedPt = computed(() =>
  mergePt(
    {
      root: {
        class: 'ui-select-button__root',
      },
      pcToggleButton: {
        root: {
          class: 'ui-select-button__button p-togglebutton p-component',
        },
      },
    } as SelectButtonPassThroughOptions,
    props.pt
  )
);
</script>

<template>
  <SelectButton
    v-bind="attrs"
    class="ui-select-button"
    :model-value="props.modelValue"
    :options="props.options"
    :option-label="props.optionLabel"
    :option-value="props.optionValue"
    :disabled="props.disabled"
    :allow-empty="props.allowEmpty"
    :multiple="props.multiple"
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
    @update:model-value="value => emit('update:modelValue', value)"
    @change="event => emit('change', event)"
  >
    <template
      v-if="$slots.option"
      #option="slotProps"
    >
      <slot
        name="option"
        v-bind="slotProps"
      />
    </template>
  </SelectButton>
</template>

<style scoped>
/*
 * NOTE: .ui-select-button__root lands on the same DOM element as .ui-select-button
 * via PT + Vue fallthrough. Layout styles live on .ui-select-button directly.
 */
.ui-select-button {
  overflow: hidden;
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--ft-space-1);

  width: 100%;
  min-height: var(--ft-control-height);

  border-radius: var(--ft-radius-lg);
}

:deep(.ui-select-button__button) {
  cursor: pointer;

  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;

  min-height: var(--ft-control-height);
  padding: 0 var(--ft-space-3);

  color: var(--ft-text-secondary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: 0;
  box-shadow: none;

  transition:
    border-color var(--ft-transition-fast),
    color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

:deep(.ui-select-button__button:hover) {
  color: var(--ft-text-primary);
  background: var(--ft-surface-overlay);
  border-color: var(--ft-border-strong);
}

:deep(.ui-select-button__button[data-p-checked='true']) {
  color: var(--ft-text-inverse);
  background: var(--ft-primary-400);
  border-color: var(--ft-primary-400);
}

:deep(.ui-select-button__button[data-p-disabled='true']) {
  cursor: not-allowed;
  opacity: 0.65;
}

:deep(.ui-select-button__button:focus-visible) {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}
</style>
