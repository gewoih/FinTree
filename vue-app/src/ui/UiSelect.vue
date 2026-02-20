<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Select from 'primevue/select';
import type { SelectPassThroughOptions } from 'primevue/select';
import { resolveFieldInvalidState } from './prime/field-state';
import { mergeClassNames, mergePt } from './prime/pt';

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
  invalid?: boolean;
  error?: string | null;
  unstyled?: boolean;
  pt?: SelectPassThroughOptions;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void;
}>();

const attrs = useAttrs();
const isInvalid = computed(() =>
  resolveFieldInvalidState({
    invalid: props.invalid,
    error: props.error,
    attrs,
  })
);
const mergedPanelClass = computed(() => ['ui-select-overlay', props.panelClass]);
const mergedOverlayClass = computed(() => ['ui-select-overlay', props.overlayClass]);

const mergedPt = computed(() =>
  mergePt(
    {
      root: {
        class: mergeClassNames(
          'ui-select__root p-select p-component p-inputwrapper',
          isInvalid.value ? 'ui-field--invalid' : undefined
        ),
      },
      label: {
        class: 'ui-select__label p-select-label',
      },
      clearIcon: {
        class: 'ui-select__clear-icon p-select-clear-icon',
      },
      dropdown: {
        class: 'ui-select__dropdown p-select-dropdown',
      },
      loadingicon: {
        class: 'ui-select__loading-icon p-select-loading-icon',
      },
      dropdownIcon: {
        class: 'ui-select__dropdown-icon p-select-dropdown-icon',
      },
      overlay: {
        class: 'ui-select-overlay p-select-overlay p-component',
      },
      header: {
        class: 'ui-select__header p-select-header',
      },
      pcFilter: {
        root: {
          class: 'ui-select__filter p-select-filter',
        },
      },
      listContainer: {
        class: 'ui-select__list-container p-select-list-container',
      },
      list: {
        class: 'ui-select__list p-select-list',
      },
      optionGroup: {
        class: 'ui-select__option-group p-select-option-group',
      },
      optionGroupLabel: {
        class: 'ui-select__option-group-label p-select-option-group-label',
      },
      option: {
        class: 'ui-select__option p-select-option',
      },
      optionLabel: {
        class: 'ui-select__option-label p-select-option-label',
      },
      optionCheckIcon: {
        class: 'ui-select__option-check-icon p-select-option-check-icon',
      },
      optionBlankIcon: {
        class: 'ui-select__option-blank-icon p-select-option-blank-icon',
      },
      emptyMessage: {
        class: 'ui-select__empty-message p-select-empty-message',
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
    :invalid="isInvalid"
    :aria-invalid="isInvalid ? 'true' : undefined"
    :unstyled="props.unstyled ?? true"
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
