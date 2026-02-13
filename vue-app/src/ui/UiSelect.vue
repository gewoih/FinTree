<script setup lang="ts">
import { useAttrs } from 'vue';
import Select from 'primevue/select';

const props = defineProps<{
  modelValue?: unknown;
  options?: unknown[];
  optionLabel?: string;
  optionValue?: string;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void;
}>();

const attrs = useAttrs();
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
  width: 100%;
  min-height: var(--control-height);
  border-radius: var(--radius-md);
}
</style>
