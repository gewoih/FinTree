<script setup lang="ts">
import { useAttrs } from 'vue';
import SelectButton from 'primevue/selectbutton';

const props = defineProps<{
  modelValue?: unknown;
  options?: unknown[];
  optionLabel?: string;
  optionValue?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  multiple?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void;
  (e: 'change', event: unknown): void;
}>();

const attrs = useAttrs();
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
