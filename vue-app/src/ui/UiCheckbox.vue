<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Checkbox from 'primevue/checkbox';
import type { CheckboxPassThroughOptions } from 'primevue/checkbox';
import { mergePt } from './prime/pt';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean | null;
    disabled?: boolean;
    binary?: boolean;
    inputId?: string;
    unstyled?: boolean;
    pt?: CheckboxPassThroughOptions;
  }>(),
  {
    modelValue: null,
    disabled: false,
    binary: true,
    inputId: undefined,
    unstyled: undefined,
    pt: undefined,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean | null): void;
}>();

const attrs = useAttrs();

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-checkbox__root p-checkbox p-component' },
      box: { class: 'ui-checkbox__box p-checkbox-box' },
      input: { class: 'ui-checkbox__input p-checkbox-input' },
      icon: { class: 'ui-checkbox__icon p-checkbox-icon' },
    } as CheckboxPassThroughOptions,
    props.pt
  )
);

const handleUpdateModelValue = (value: unknown) => {
  emit('update:modelValue', typeof value === 'boolean' ? value : null);
};
</script>

<template>
  <Checkbox
    v-bind="attrs"
    class="ui-checkbox"
    :model-value="props.modelValue"
    :disabled="props.disabled"
    :binary="props.binary"
    :input-id="props.inputId"
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
    @update:model-value="handleUpdateModelValue"
  />
</template>

<style scoped>
/*
 * NOTE: .ui-checkbox__root and data-v-xxx land on the same DOM element via
 * PrimeVue PT + Vue fallthrough, so :deep(.ui-checkbox__root) would compile
 * to [data-v-xxx] .ui-checkbox__root (descendant combinator) and never match.
 * Root-element styles and state selectors live on .ui-checkbox instead.
 */
.ui-checkbox {
  position: relative;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 1.25rem;
  height: 1.25rem;
}

:deep(.ui-checkbox__input) {
  cursor: pointer;

  position: absolute;
  inset: 0;

  margin: 0;

  opacity: 0;
}

:deep(.ui-checkbox__box) {
  display: grid;
  place-items: center;

  width: 1.25rem;
  height: 1.25rem;

  color: transparent;

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-sm);

  transition:
    background-color var(--ft-transition-fast),
    border-color var(--ft-transition-fast),
    color var(--ft-transition-fast);
}

:deep(.ui-checkbox__icon) {
  width: 0.85rem;
  height: 0.85rem;
}

.ui-checkbox[data-p-checked='true'] :deep(.ui-checkbox__box) {
  color: var(--ft-text-inverse);
  background: var(--ft-primary-400);
  border-color: var(--ft-primary-400);
}

.ui-checkbox[data-p-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.6;
}

:deep(.ui-checkbox__input:focus-visible ~ .ui-checkbox__box) {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}
</style>
