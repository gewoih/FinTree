<script setup lang="ts">
import { useAttrs } from 'vue';
import DatePicker from 'primevue/datepicker';

const props = defineProps<{
  modelValue?: Date[] | Date | null;
  placeholder?: string;
  disabled?: boolean;
  selectionMode?: 'single' | 'range' | 'multiple';
  manualInput?: boolean;
  dateFormat?: string;
  showButtonBar?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date[] | Date | null): void;
}>();

const attrs = useAttrs();
</script>

<template>
  <DatePicker
    v-bind="attrs"
    class="ui-date-picker"
    :model-value="props.modelValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :selection-mode="props.selectionMode"
    :manual-input="props.manualInput"
    :date-format="props.dateFormat"
    :show-button-bar="props.showButtonBar"
    :select-other-months="true"
    @update:model-value="val => emit('update:modelValue', val as Date[] | Date | null)"
  />
</template>

<style scoped>
.ui-date-picker {
  width: 100%;
  min-height: var(--ft-control-height);
  border-radius: var(--ft-radius-lg);
}
</style>
