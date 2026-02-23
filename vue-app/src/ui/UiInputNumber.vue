<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import InputNumber from 'primevue/inputnumber';
import type {
  InputNumberBlurEvent,
  InputNumberInputEvent,
  InputNumberPassThroughOptions,
} from 'primevue/inputnumber';
import { resolveFieldInvalidState } from './prime/field-state';
import { mergePt } from './prime/pt';

const props = defineProps<{
  modelValue?: number | null;
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
  error?: string | null;
  mode?: 'decimal' | 'currency';
  minFractionDigits?: number;
  maxFractionDigits?: number;
  min?: number;
  max?: number;
  unstyled?: boolean;
  pt?: InputNumberPassThroughOptions;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void;
  (e: 'input', event: InputNumberInputEvent): void;
  (e: 'focus', event: Event): void;
  (e: 'blur', event: InputNumberBlurEvent): void;
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
        class: 'ui-input-number__root p-inputnumber p-component p-inputwrapper',
      },
      pcInputText: {
        root: {
          class: 'ui-input-number__input p-inputnumber-input p-inputtext',
        },
      },
    } as InputNumberPassThroughOptions,
    props.pt
  )
);

const handleUpdateModelValue = (value: number | null | undefined) => {
  emit('update:modelValue', value ?? null);
};

const handleInput = (event: InputNumberInputEvent) => {
  emit('input', event);
};

const handleFocus = (event: Event) => {
  emit('focus', event);
};

const handleBlur = (event: InputNumberBlurEvent) => {
  emit('blur', event);
};
</script>

<template>
  <InputNumber
    v-bind="attrs"
    :class="['ui-input-number', { 'ui-field--invalid': isInvalid }]"
    :model-value="props.modelValue"
    :disabled="props.disabled"
    :placeholder="props.placeholder"
    :mode="props.mode"
    :min-fraction-digits="props.minFractionDigits"
    :max-fraction-digits="props.maxFractionDigits"
    :min="props.min"
    :max="props.max"
    :invalid="isInvalid"
    :aria-invalid="isInvalid ? 'true' : undefined"
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
    @update:model-value="handleUpdateModelValue"
    @input="handleInput"
    @focus="handleFocus"
    @blur="handleBlur"
  />
</template>

<style scoped>
/* Root container — all root styles on the fallthrough class, NOT :deep() */
.ui-input-number {
  overflow: hidden;
  display: flex;
  align-items: center;

  width: 100%;
  min-height: var(--ft-control-height);

  font-size: var(--ft-text-base);
  color: var(--ft-text-primary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);

  transition:
    border-color var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

/* Focus ring */
.ui-input-number:focus-within {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}

/* Hover state */
.ui-input-number:not(.p-disabled):hover {
  background: color-mix(in srgb, var(--ft-surface-overlay) 72%, var(--ft-surface-base));
  border-color: var(--ft-border-strong);
}

/* Invalid state */
.ui-input-number.ui-field--invalid {
  border-color: var(--ft-danger-500);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ft-danger-500) 18%, transparent);
}

/* Inner input element — :deep() correct (child element) */
:deep(.ui-input-number__input) {
  width: 100%;
  min-height: calc(var(--ft-control-height) - 2px);
  padding: 0 var(--ft-space-4);

  font-size: var(--ft-text-base);
  font-variant-numeric: tabular-nums;
  line-height: var(--ft-leading-tight);
  color: var(--ft-text-primary);

  background: transparent;
  border: 0;
  border-radius: 0;
  outline: 0;
}

/* Placeholder */
:deep(.ui-input-number__input::placeholder) {
  color: var(--ft-text-tertiary);
  opacity: 1;
}

/* Disabled state */
:deep(.ui-input-number__input:disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
