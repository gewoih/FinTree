<script setup lang="ts">
import { useAttrs } from 'vue';
import InputText from 'primevue/inputtext';

const props = defineProps<{
  modelValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const attrs = useAttrs();

const handleUpdateModelValue = (value: string | null | undefined) => {
  emit('update:modelValue', value ?? '');
};
</script>

<template>
  <InputText
    v-bind="attrs"
    class="ui-input"
    :model-value="props.modelValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :type="props.type"
    @update:model-value="handleUpdateModelValue"
  />
</template>

<style scoped>
.ui-input {
  width: 100%;
  min-height: var(--ft-control-height);
  border-radius: var(--ft-radius-lg);
}
</style>
