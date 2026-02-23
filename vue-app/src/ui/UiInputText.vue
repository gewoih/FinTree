<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import InputText from 'primevue/inputtext';
import type { InputTextPassThroughOptions } from 'primevue/inputtext';
import { mergePt } from './prime/pt';
import { resolveFieldInvalidState } from './prime/field-state';

const props = defineProps<{
  modelValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  invalid?: boolean;
  error?: string | null;
  unstyled?: boolean;
  pt?: InputTextPassThroughOptions;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const attrs = useAttrs();
const isInvalid = computed(() =>
  resolveFieldInvalidState({
    invalid: props.invalid,
    error: props.error,
    attrs,
  })
);

const mergedPt = computed(() =>
  mergePt(
    {
      root: {
        class: 'ui-input__root p-inputtext',
      },
    } as InputTextPassThroughOptions,
    props.pt
  )
);

const handleUpdateModelValue = (value: string | null | undefined) => {
  emit('update:modelValue', value ?? '');
};
</script>

<template>
  <InputText
    v-bind="attrs"
    :class="['ui-input', { 'ui-field--invalid': isInvalid }]"
    :model-value="props.modelValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :type="props.type"
    :invalid="isInvalid"
    :aria-invalid="isInvalid ? 'true' : undefined"
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
    @update:model-value="handleUpdateModelValue"
  />
</template>

<style scoped>
.ui-input {
  overflow: hidden;
  display: flex;
  align-items: center;

  width: 100%;
  min-height: var(--ft-control-height);
  padding: 0 var(--ft-space-4);

  font-size: var(--ft-text-base);
  line-height: var(--ft-leading-tight);
  color: var(--ft-text-primary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);

  transition:
    border-color var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.ui-input:focus-visible {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}

.ui-input::placeholder {
  color: var(--ft-text-tertiary);
  opacity: 1;
}

.ui-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.ui-input.ui-field--invalid {
  border-color: var(--ft-danger-500);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ft-danger-500) 18%, transparent);
}
</style>
