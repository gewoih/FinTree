<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Select from 'primevue/select';
import type { SelectPassThroughOptions } from 'primevue/select';
import { resolveFieldInvalidState } from './prime/field-state';
import { mergeClassNames, mergePt } from './prime/pt';

const props = defineProps<{
  modelValue?: unknown;
  options?: unknown[];
  optionLabel?: string;
  optionValue?: string;
  placeholder?: string;
  disabled?: boolean;
  panelClass?: unknown;
  overlayClass?: unknown;
  appendTo?: string | HTMLElement;
  invalid?: boolean;
  error?: string | null;
  unstyled?: boolean;
  pt?: SelectPassThroughOptions;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void;
}>();

const attrs = useAttrs();
const isInvalid = computed(() =>
  resolveFieldInvalidState({
    invalid: props.invalid,
    error: props.error,
    attrs,
  })
);
const mergedPanelClass = computed(() => ['ui-select-overlay', props.panelClass]);
const mergedOverlayClass = computed(() => ['ui-select-overlay', props.overlayClass]);

const mergedPt = computed(() =>
  mergePt(
    {
      root: {
        class: mergeClassNames(
          'ui-select__root p-select p-component p-inputwrapper',
          isInvalid.value ? 'ui-field--invalid' : undefined
        ),
      },
      label: {
        class: 'ui-select__label p-select-label',
      },
      clearIcon: {
        class: 'ui-select__clear-icon p-select-clear-icon',
      },
      dropdown: {
        class: 'ui-select__dropdown p-select-dropdown',
      },
      loadingicon: {
        class: 'ui-select__loading-icon p-select-loading-icon',
      },
      dropdownIcon: {
        class: 'ui-select__dropdown-icon p-select-dropdown-icon',
      },
      overlay: {
        class: 'ui-select-overlay p-select-overlay p-component',
      },
      header: {
        class: 'ui-select__header p-select-header',
      },
      pcFilter: {
        root: {
          class: 'ui-select__filter p-select-filter',
        },
      },
      listContainer: {
        class: 'ui-select__list-container p-select-list-container',
      },
      list: {
        class: 'ui-select__list p-select-list',
      },
      optionGroup: {
        class: 'ui-select__option-group p-select-option-group',
      },
      optionGroupLabel: {
        class: 'ui-select__option-group-label p-select-option-group-label',
      },
      option: {
        class: 'ui-select__option p-select-option',
      },
      optionLabel: {
        class: 'ui-select__option-label p-select-option-label',
      },
      optionCheckIcon: {
        class: 'ui-select__option-check-icon p-select-option-check-icon',
      },
      optionBlankIcon: {
        class: 'ui-select__option-blank-icon p-select-option-blank-icon',
      },
      emptyMessage: {
        class: 'ui-select__empty-message p-select-empty-message',
      },
    } as SelectPassThroughOptions,
    props.pt
  )
);
</script>

<template>
  <Select
    v-bind="attrs"
    class="ui-select"
    :model-value="props.modelValue"
    :options="props.options"
    :option-label="props.optionLabel"
    :option-value="props.optionValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :panel-class="mergedPanelClass"
    :overlay-class="mergedOverlayClass"
    :append-to="props.appendTo ?? 'body'"
    :invalid="isInvalid"
    :aria-invalid="isInvalid ? 'true' : undefined"
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <template
      v-if="$slots.value"
      #value="slotProps"
    >
      <slot
        name="value"
        v-bind="slotProps"
      />
    </template>
    <template
      v-if="$slots.option"
      #option="slotProps"
    >
      <slot
        name="option"
        v-bind="slotProps"
      />
    </template>
  </Select>
</template>

<style scoped>
/* ── Root trigger (not teleported) ── */

/*
 * NOTE: .ui-select__root and data-v-xxx land on the same DOM element via
 * PrimeVue PT + Vue fallthrough, so :deep(.ui-select__root) would compile
 * to [data-v-xxx] .ui-select__root (descendant combinator) and never match.
 * All root-element styles live here on .ui-select instead.
 */
.ui-select {
  overflow: hidden;
  display: flex;
  align-items: center;

  width: 100%;
  min-height: var(--ft-control-height);

  font-size: var(--ft-text-base);
  color: var(--ft-text-primary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);

  transition:
    border-color var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.ui-select:focus-within {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}

:deep(.ui-select__label) {
  overflow: hidden;
  display: flex;
  align-items: center;

  width: 100%;
  min-height: calc(var(--ft-control-height) - 2px);
  padding: 0 var(--ft-space-4);

  font-size: var(--ft-text-base);
  line-height: var(--ft-leading-tight);
  color: var(--ft-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;

  background: transparent;
  border: 0;
  outline: 0;
}

:deep(.ui-select__dropdown) {
  display: inline-flex;
  align-items: center;
  align-self: stretch;
  justify-content: center;

  min-width: calc(var(--ft-control-height) - 2px);
  padding: 0 var(--ft-space-3);

  color: var(--ft-text-secondary);

  background: transparent;
  border: 0;
  border-inline-start: 1px solid var(--ft-border-soft);

  transition:
    color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

:deep(.ui-select__dropdown svg) {
  width: 1rem;
  height: 1rem;
  transition: transform var(--ft-transition-fast);
}

.ui-select:not(.p-disabled):hover :deep(.ui-select__dropdown) {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-surface-overlay) 65%, transparent);
}

.ui-select.p-select-open :deep(.ui-select__dropdown svg) {
  transform: rotate(180deg);
}

.ui-select.ui-field--invalid {
  border-color: var(--ft-danger-500);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ft-danger-500) 18%, transparent);
}

.ui-select.ui-field--invalid :deep(.ui-select__dropdown) {
  border-inline-start-color: color-mix(in srgb, var(--ft-danger-500) 42%, var(--ft-border-soft));
}

.ui-select:not(.p-disabled):hover {
  background: color-mix(in srgb, var(--ft-surface-overlay) 72%, var(--ft-surface-base));
  border-color: var(--ft-border-strong);
}

.ui-select.p-select-open {
  border-color: var(--ft-border-strong);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--ft-primary-300) 38%, transparent),
    var(--ft-shadow-sm);
}

/* ── Overlay panel (teleported — use :global()) ── */

:global(.ui-select-overlay) {
  isolation: isolate;
  z-index: var(--ft-z-dropdown);

  overflow: hidden;

  min-width: 13rem;
  max-width: min(28rem, calc(100vw - (var(--ft-space-4) * 2)));
  padding: var(--ft-space-1);

  color: var(--ft-text-primary);

  opacity: 1;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--ft-surface-overlay) 92%, transparent) 0%,
    var(--ft-surface-raised) 100%
  );
  backdrop-filter: blur(8px);
  border: 1px solid color-mix(in srgb, var(--ft-border-default) 88%, var(--ft-border-strong));
  border-radius: var(--ft-radius-lg);
  box-shadow:
    0 18px 32px color-mix(in srgb, var(--ft-bg-base) 60%, transparent),
    0 2px 8px color-mix(in srgb, var(--ft-bg-base) 32%, transparent);
}

:global(.ui-select__header) {
  margin-bottom: var(--ft-space-1);
  padding: var(--ft-space-2);
  border-bottom: 1px solid var(--ft-border-soft);
}

:global(.ui-select__filter) {
  width: 100%;
  min-height: 2.25rem;
  padding: 0 var(--ft-space-3);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-primary);

  background: color-mix(in srgb, var(--ft-surface-base) 82%, transparent);
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-md);

  transition:
    border-color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

:global(.ui-select__filter:focus-visible) {
  border-color: var(--ft-border-strong);
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ft-focus-ring) 52%, transparent);
}

:global(.ui-select__list-container) {
  scrollbar-color: var(--ft-scrollbar-thumb) var(--ft-scrollbar-track);
  scrollbar-width: thin;

  overflow: auto;
  overscroll-behavior: contain;

  max-height: min(22rem, 52vh);
  padding: var(--ft-space-1);

  background: var(--ft-surface-raised);
}

:global(.ui-select__list-container)::-webkit-scrollbar {
  width: var(--ft-scrollbar-size);
  height: var(--ft-scrollbar-size);
}

:global(.ui-select__list-container)::-webkit-scrollbar-track {
  background: var(--ft-scrollbar-track);
  border-radius: var(--ft-radius-full);
}

:global(.ui-select__list-container)::-webkit-scrollbar-thumb {
  background: var(--ft-scrollbar-thumb);
  border: 2px solid var(--ft-scrollbar-track);
  border-radius: var(--ft-radius-full);
}

:global(.ui-select__list-container)::-webkit-scrollbar-thumb:hover {
  background: var(--ft-scrollbar-thumb-hover);
}

:global(.ui-select__list-container)::-webkit-scrollbar-thumb:active {
  background: var(--ft-scrollbar-thumb-active);
}

:global(.ui-select__list) {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

:global(.ui-select__option) {
  cursor: pointer;

  position: relative;

  overflow: hidden;
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-3);

  font-size: var(--ft-text-base);
  color: var(--ft-text-primary);

  border: 1px solid transparent;
  border-radius: var(--ft-radius-md);

  transition:
    border-color var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    color var(--ft-transition-fast);
}

:global(.ui-select__option-label) {
  overflow: hidden;
  flex: 1;

  min-width: 0;

  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.ui-select__option-check-icon) {
  color: var(--ft-primary-200);
}

:global(.ui-select__option[data-p-focused='true']),
:global(.ui-select__option:hover) {
  background: color-mix(in srgb, var(--ft-primary-400) 14%, transparent);
  border-color: color-mix(in srgb, var(--ft-primary-400) 38%, transparent);
}

:global(.ui-select__option[data-p-selected='true']) {
  font-weight: var(--ft-font-medium);
  background: color-mix(in srgb, var(--ft-primary-400) 24%, transparent);
  border-color: color-mix(in srgb, var(--ft-primary-400) 45%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ft-primary-300) 45%, transparent);
}

:global(.ui-select__option[data-p-disabled='true']) {
  cursor: not-allowed;
  opacity: 0.55;
}

:global(.ui-select__empty-message) {
  padding: var(--ft-space-3) var(--ft-space-3) var(--ft-space-4);
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

@media (width <= 480px) {
  :global(.ui-select-overlay) {
    max-width: calc(100vw - (var(--ft-space-4) * 2));
  }
}
</style>
