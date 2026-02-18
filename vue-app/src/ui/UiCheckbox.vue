<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Checkbox from 'primevue/checkbox';
import { mergePt } from './prime/pt';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean | null;
    disabled?: boolean;
    binary?: boolean;
    inputId?: string;
    unstyled?: boolean;
    pt?: Record<string, unknown>;
  }>(),
  {
    modelValue: null,
    disabled: false,
    binary: true,
    inputId: undefined,
    unstyled: undefined,
    pt: undefined,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean | null): void;
}>();

const attrs = useAttrs();

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-checkbox__root p-checkbox p-component' },
      box: { class: 'ui-checkbox__box p-checkbox-box' },
      input: { class: 'ui-checkbox__input p-checkbox-input' },
      icon: { class: 'ui-checkbox__icon p-checkbox-icon' },
    } as Record<string, unknown>,
    props.pt
  )
);

const handleUpdateModelValue = (value: unknown) => {
  emit('update:modelValue', typeof value === 'boolean' ? value : null);
};
</script>

<template>
  <Checkbox
    v-bind="attrs"
    class="ui-checkbox"
    :model-value="props.modelValue"
    :disabled="props.disabled"
    :binary="props.binary"
    :input-id="props.inputId"
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
    @update:model-value="handleUpdateModelValue"
  />
</template>

<style scoped>
.ui-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
