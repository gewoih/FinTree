<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import InputText from 'primevue/inputtext';
import type { InputTextPassThroughOptions } from 'primevue/inputtext';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
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
const isUnstyled = computed(() => resolvePrimeUnstyled('uiInputText', props.unstyled));
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
    :unstyled="isUnstyled"
    :pt="mergedPt"
    @update:model-value="handleUpdateModelValue"
  />
</template>

<style scoped>
.ui-input {
  overflow: hidden;
  width: 100%;
  min-height: var(--ft-control-height);
  border-radius: var(--ft-radius-lg);
}
</style>
