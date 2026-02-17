<script setup lang="ts">
import { useAttrs } from 'vue';
import InputNumber from 'primevue/inputnumber';
import type { InputNumberBlurEvent, InputNumberInputEvent } from 'primevue/inputnumber';

const props = defineProps<{
  modelValue?: number | null;
  disabled?: boolean;
  placeholder?: string;
  mode?: 'decimal' | 'currency';
  minFractionDigits?: number;
  maxFractionDigits?: number;
  min?: number;
  max?: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void;
  (e: 'input', event: InputNumberInputEvent): void;
  (e: 'focus', event: Event): void;
  (e: 'blur', event: InputNumberBlurEvent): void;
}>();

const attrs = useAttrs();

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
