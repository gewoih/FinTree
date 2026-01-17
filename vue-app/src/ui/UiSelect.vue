<script setup lang="ts">
import Select from 'primevue/select';

const props = defineProps<{
  modelValue?: unknown;
  options?: unknown[];
  optionLabel?: string;
  optionValue?: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void;
}>();
</script>

<template>
  <Select
    :model-value="modelValue"
    :options="options"
    :option-label="optionLabel"
    :option-value="optionValue"
    :placeholder="placeholder"
    class="ui-select"
    v-bind="$attrs"
    @update:model-value="value => emit('update:modelValue', value)"
  />
</template>

<style scoped>
.ui-select {
  width: 100%;
  border-radius: var(--radius-md);
}
</style>
