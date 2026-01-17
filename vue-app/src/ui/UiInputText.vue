<script setup lang="ts">
import InputText from 'primevue/inputtext';

const props = defineProps<{
  modelValue?: string | number | null;
  type?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void;
}>();
</script>

<template>
  <InputText
    :type="type"
    :model-value="modelValue"
    class="ui-input"
    v-bind="$attrs"
    @update:model-value="value => emit('update:modelValue', value)"
  />
</template>

<style scoped>
.ui-input {
  width: 100%;
  height: var(--control-height);
  border-radius: var(--radius-md);
}
</style>
