<script setup lang="ts">
import { useAttrs } from 'vue';
import InputText from 'primevue/inputtext';

const props = defineProps<{
  modelValue?: string | number | null;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void;
}>();

const attrs = useAttrs();
</script>

<template>
  <InputText
    v-bind="attrs"
    class="ui-input"
    :model-value="props.modelValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :type="props.type"
    @update:model-value="val => emit('update:modelValue', val ?? '')"
  />
</template>

<style scoped>
.ui-input {
  min-height: var(--control-height);
  width: 100%;
  border-radius: var(--radius-md);
}
</style>
