<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Select from 'primevue/select';
import type { SelectPassThroughOptions } from 'primevue/select';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
import { mergePt } from './prime/pt';

const props = defineProps<{
  modelValue?: unknown;
  options?: unknown[];
  optionLabel?: string;
  optionValue?: string;
  placeholder?: string;
  disabled?: boolean;
  panelClass?: unknown;
  overlayClass?: unknown;
  appendTo?: string | HTMLElement;
  unstyled?: boolean;
  pt?: SelectPassThroughOptions;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void;
}>();

const attrs = useAttrs();
const isUnstyled = computed(() => resolvePrimeUnstyled('uiSelect', props.unstyled));
const mergedPanelClass = computed(() => ['ui-select-overlay', props.panelClass]);
const mergedOverlayClass = computed(() => ['ui-select-overlay', props.overlayClass]);

const mergedPt = computed(() =>
  mergePt(
    {
      root: {
        class: 'ui-select__root',
      },
      label: {
        class: 'ui-select__label',
      },
      dropdown: {
        class: 'ui-select__dropdown',
      },
      overlay: {
        class: 'ui-select-overlay',
      },
    } as SelectPassThroughOptions,
    props.pt
  )
);
</script>

<template>
  <Select
    v-bind="attrs"
    class="ui-select"
    :model-value="props.modelValue"
    :options="props.options"
    :option-label="props.optionLabel"
    :option-value="props.optionValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :panel-class="mergedPanelClass"
    :overlay-class="mergedOverlayClass"
    :append-to="props.appendTo ?? 'body'"
    :unstyled="isUnstyled"
    :pt="mergedPt"
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <template
      v-if="$slots.value"
      #value="slotProps"
    >
      <slot
        name="value"
        v-bind="slotProps"
      />
    </template>
    <template
      v-if="$slots.option"
      #option="slotProps"
    >
      <slot
        name="option"
        v-bind="slotProps"
      />
    </template>
  </Select>
</template>

<style scoped>
.ui-select {
  overflow: hidden;
  width: 100%;
  min-height: var(--ft-control-height);
  border-radius: var(--ft-radius-lg);
}

.ui-select :deep(.p-select-label),
.ui-select :deep(.p-select-dropdown) {
  border-radius: 0;
}

.ui-select :deep(.p-select-label) {
  background: transparent;
}
</style>
