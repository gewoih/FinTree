<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import ToggleSwitch from 'primevue/toggleswitch';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
import { mergePt } from './prime/pt';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    disabled?: boolean;
    inputId?: string;
    unstyled?: boolean;
    pt?: Record<string, unknown>;
  }>(),
  {
    modelValue: false,
    disabled: false,
    inputId: undefined,
    unstyled: undefined,
    pt: undefined,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();

const attrs = useAttrs();
const isUnstyled = computed(() => resolvePrimeUnstyled('uiToggleSwitch', props.unstyled));

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-toggle-switch__root' },
      slider: { class: 'ui-toggle-switch__slider' },
      handle: { class: 'ui-toggle-switch__handle' },
      input: { class: 'ui-toggle-switch__input' },
    } as Record<string, unknown>,
    props.pt
  )
);

const handleUpdateModelValue = (value: unknown) => {
  emit('update:modelValue', Boolean(value));
};
</script>

<template>
  <ToggleSwitch
    v-bind="attrs"
    class="ui-toggle-switch"
    :model-value="props.modelValue"
    :disabled="props.disabled"
    :input-id="props.inputId"
    :unstyled="isUnstyled"
    :pt="mergedPt"
    @update:model-value="handleUpdateModelValue"
  />
</template>

<style scoped>
.ui-toggle-switch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
