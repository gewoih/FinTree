<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Checkbox from 'primevue/checkbox';
import { mergePt } from './prime/pt';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean | null;
    disabled?: boolean;
    binary?: boolean;
    inputId?: string;
    unstyled?: boolean;
    pt?: Record<string, unknown>;
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
    } as Record<string, unknown>,
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
.ui-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

:deep(.ui-checkbox__root),
:deep(.p-checkbox) {
  position: relative;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 1.25rem;
  height: 1.25rem;
}

:deep(.ui-checkbox__input),
:deep(.p-checkbox .p-checkbox-input) {
  cursor: pointer;

  position: absolute;
  inset: 0;

  margin: 0;

  opacity: 0;
}

:deep(.ui-checkbox__box),
:deep(.p-checkbox .p-checkbox-box) {
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

:deep(.ui-checkbox__icon),
:deep(.p-checkbox .p-checkbox-icon) {
  width: 0.85rem;
  height: 0.85rem;
}

:deep(.ui-checkbox__root[data-p-checked='true'] .ui-checkbox__box),
:deep(.p-checkbox.p-checkbox-checked .p-checkbox-box) {
  color: var(--ft-text-inverse);
  background: var(--ft-primary-400);
  border-color: var(--ft-primary-400);
}

:deep(.ui-checkbox__root[data-p-disabled='true']),
:deep(.p-checkbox.p-disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}

:deep(.ui-checkbox__root:has(.ui-checkbox__input:focus-visible) .ui-checkbox__box),
:deep(.p-checkbox:has(.p-checkbox-input:focus-visible) .p-checkbox-box) {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}
</style>
