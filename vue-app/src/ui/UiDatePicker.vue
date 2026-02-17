<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import DatePicker from 'primevue/datepicker';

const props = defineProps<{
  modelValue?: Date[] | Date | null;
  placeholder?: string;
  disabled?: boolean;
  selectionMode?: 'single' | 'range' | 'multiple';
  manualInput?: boolean;
  dateFormat?: string;
  showButtonBar?: boolean;
  panelClass?: unknown;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date[] | Date | null): void;
}>();

const attrs = useAttrs();
const mergedPanelClass = computed(() => ['ui-date-picker-overlay', props.panelClass]);
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
    :panel-class="mergedPanelClass"
    :select-other-months="true"
    @update:model-value="val => emit('update:modelValue', val as Date[] | Date | null)"
  />
</template>

<style scoped>
.ui-date-picker {
  overflow: hidden;
  width: 100%;
  min-height: var(--ft-control-height);
  border-radius: var(--ft-radius-lg);
}

.ui-date-picker :deep(.p-datepicker-input),
.ui-date-picker :deep(.p-datepicker-dropdown) {
  border-radius: 0;
}
</style>
