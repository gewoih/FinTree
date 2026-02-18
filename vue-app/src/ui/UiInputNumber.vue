<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import InputNumber from 'primevue/inputnumber';
import type {
  InputNumberBlurEvent,
  InputNumberInputEvent,
  InputNumberPassThroughOptions,
} from 'primevue/inputnumber';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
import { resolveFieldInvalidState } from './prime/field-state';
import { mergeClassNames, mergePt } from './prime/pt';

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
const isUnstyled = computed(() => resolvePrimeUnstyled('uiInputNumber', props.unstyled));
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
        class: mergeClassNames(
          'ui-input-number__root p-inputnumber p-component p-inputwrapper',
          isInvalid.value ? 'ui-field--invalid' : undefined
        ),
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
    class="ui-input-number"
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
    :unstyled="isUnstyled"
    :pt="mergedPt"
    @update:model-value="handleUpdateModelValue"
    @input="handleInput"
    @focus="handleFocus"
    @blur="handleBlur"
  />
</template>

<style scoped>
.ui-input-number {
  overflow: hidden;
  width: 100%;
  min-height: var(--ft-control-height);
  border-radius: var(--ft-radius-lg);
}

.ui-input-number :deep(.p-inputnumber-input) {
  border-radius: 0;
}
</style>
