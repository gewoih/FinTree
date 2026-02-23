<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import ToggleSwitch from 'primevue/toggleswitch';
import type { ToggleSwitchPassThroughOptions } from 'primevue/toggleswitch';
import { mergePt } from './prime/pt';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    disabled?: boolean;
    inputId?: string;
    unstyled?: boolean;
    pt?: ToggleSwitchPassThroughOptions;
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

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-toggle-switch__root p-toggleswitch p-component' },
      slider: { class: 'ui-toggle-switch__slider p-toggleswitch-slider' },
      handle: { class: 'ui-toggle-switch__handle p-toggleswitch-handle' },
      input: { class: 'ui-toggle-switch__input p-toggleswitch-input' },
    } as ToggleSwitchPassThroughOptions,
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
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
    @update:model-value="handleUpdateModelValue"
  />
</template>

<style scoped>
/*
 * NOTE: .ui-toggle-switch__root and data-v-xxx land on the same DOM element via
 * PrimeVue PT + Vue fallthrough. Root-element styles and state selectors live
 * on .ui-toggle-switch instead.
 */
.ui-toggle-switch {
  cursor: pointer;

  position: relative;

  display: inline-flex;
  align-items: center;

  width: 2.5rem;
  height: 1.4rem;
}

:deep(.ui-toggle-switch__input) {
  cursor: pointer;

  position: absolute;
  z-index: var(--ft-z-above);
  inset: 0;

  margin: 0;

  opacity: 0;
}

:deep(.ui-toggle-switch__slider) {
  pointer-events: none;

  position: relative;

  display: block;

  width: 2.5rem;
  height: 1.4rem;

  background: var(--ft-border-default);
  border-radius: var(--ft-radius-full);

  transition: background-color var(--ft-transition-fast);
}

:deep(.ui-toggle-switch__handle) {
  pointer-events: none;

  position: absolute;
  top: 0.15rem;
  left: 0.15rem;

  width: 1.1rem;
  height: 1.1rem;

  background: var(--ft-surface-overlay);
  border-radius: var(--ft-radius-full);

  transition: transform var(--ft-transition-fast);
}

.ui-toggle-switch[data-p-checked='true'] :deep(.ui-toggle-switch__slider) {
  background: var(--ft-primary-400);
}

.ui-toggle-switch[data-p-checked='true'] :deep(.ui-toggle-switch__handle) {
  transform: translateX(1.1rem);
}

.ui-toggle-switch[data-p-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.6;
}

:deep(.ui-toggle-switch__input:focus-visible ~ .ui-toggle-switch__slider) {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}
</style>
