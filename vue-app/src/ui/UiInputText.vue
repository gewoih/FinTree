<script setup lang="ts">
import { useAttrs } from 'vue'
import InputText from 'primevue/inputtext'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  type?: string
  id?: string
  disabled?: boolean
}>

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const attrs = useAttrs()
</script>

<template>
  <InputText
    v-bind="attrs"
    class="ui-input"
    :id="props.id"
    :model-value="props.modelValue"
    :placeholder="props.placeholder"
    :type="props.type"
    :disabled="props.disabled"
    @update:model-value="value => emit('update:modelValue', value ?? '')"
  />
</template>

<style scoped>
.ui-input {
  width: 100%;
  min-height: var(--control-height);
  border-radius: var(--radius-md);
  background: var(--surface-1);
}
</style>
