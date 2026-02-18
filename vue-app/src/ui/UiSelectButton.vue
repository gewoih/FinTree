<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import SelectButton from 'primevue/selectbutton';
import type { SelectButtonPassThroughOptions } from 'primevue/selectbutton';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
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
const isUnstyled = computed(() => resolvePrimeUnstyled('uiSelectButton', props.unstyled));

const mergedPt = computed(() =>
  mergePt(
    {
      root: {
        class: 'ui-select-button__root',
      },
      button: {
        class: 'ui-select-button__button',
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
    :unstyled="isUnstyled"
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
.ui-select-button {
  overflow: hidden;
  width: 100%;
  min-height: var(--ft-control-height);
  border-radius: var(--ft-radius-lg);
}

.ui-select-button :deep(.p-selectbutton) {
  overflow: hidden;
  width: 100%;
  border-radius: inherit;
}

.ui-select-button :deep(.p-togglebutton) {
  border-radius: 0;
  box-shadow: none;
}
</style>
