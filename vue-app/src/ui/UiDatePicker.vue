<script setup lang="ts">
import { useAttrs } from 'vue'
import DatePicker from 'primevue/datepicker'

const props = defineProps<{
  modelValue?: Date[] | Date | null
  selectionMode?: 'single' | 'range' | 'multiple'
  placeholder?: string
  inputId?: string
  disabled?: boolean
  dateFormat?: string
  manualInput?: boolean
  showButtonBar?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Date[] | Date | null]
}>()

const attrs = useAttrs()
</script>

<template>
  <DatePicker
    v-bind="attrs"
    class="ui-date-picker"
    :model-value="props.modelValue"
    :selection-mode="props.selectionMode"
    :placeholder="props.placeholder"
    :inputId="props.inputId"
    :disabled="props.disabled"
    :date-format="props.dateFormat"
    :manual-input="props.manualInput"
    :show-button-bar="props.showButtonBar"
    @update:model-value="value => emit('update:modelValue', value as Date[] | Date | null)"
  />
</template>

<style scoped>
.ui-date-picker {
  width: 100%;
  min-height: var(--control-height);
  border-radius: var(--radius-md);
}
</style>
