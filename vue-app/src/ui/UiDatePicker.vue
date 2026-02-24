<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import DatePicker from 'primevue/datepicker';
import type { DatePickerPassThroughOptions } from 'primevue/datepicker';
import { resolveFieldInvalidState } from './prime/field-state';

const props = withDefaults(
  defineProps<{
    modelValue?: Date[] | Date | null;
    placeholder?: string;
    disabled?: boolean;
    selectionMode?: 'single' | 'range' | 'multiple';
    manualInput?: boolean;
    dateFormat?: string;
    showButtonBar?: boolean;
    panelClass?: unknown;
    appendTo?: string | HTMLElement;
    autoZIndex?: boolean;
    baseZIndex?: number;
    invalid?: boolean;
    error?: string | null;
    unstyled?: boolean;
    pt?: DatePickerPassThroughOptions;
  }>(),
  {
    modelValue: undefined,
    placeholder: undefined,
    disabled: false,
    selectionMode: undefined,
    manualInput: undefined,
    dateFormat: undefined,
    showButtonBar: undefined,
    panelClass: undefined,
    appendTo: undefined,
    autoZIndex: true,
    baseZIndex: 0,
    invalid: false,
    error: null,
    unstyled: undefined,
    pt: undefined,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date[] | Date | null): void;
}>();

const attrs = useAttrs();
const isInvalid = computed(() =>
  resolveFieldInvalidState({
    invalid: props.invalid,
    error: props.error,
    attrs,
  })
);
const mergedPanelClass = computed(() => ['ui-date-picker-overlay', props.panelClass]);
</script>

<template>
  <DatePicker
    v-bind="attrs"
    :class="['ui-date-picker', { 'ui-field--invalid': isInvalid }]"
    :model-value="props.modelValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :selection-mode="props.selectionMode"
    :manual-input="props.manualInput"
    :date-format="props.dateFormat"
    :show-button-bar="props.showButtonBar"
    :panel-class="mergedPanelClass"
    :append-to="props.appendTo ?? 'body'"
    :auto-z-index="props.autoZIndex"
    :base-z-index="props.baseZIndex"
    :select-other-months="true"
    :invalid="isInvalid"
    :aria-invalid="isInvalid ? 'true' : undefined"
    :unstyled="props.unstyled"
    :pt="props.pt"
    @update:model-value="val => emit('update:modelValue', val as Date[] | Date | null)"
  />
</template>

<style scoped>
.ui-date-picker {
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

.ui-date-picker:focus-within {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}

.ui-date-picker:not(.p-disabled):hover {
  background: color-mix(in srgb, var(--ft-surface-overlay) 72%, var(--ft-surface-base));
  border-color: var(--ft-border-strong);
}

.ui-date-picker.p-inputwrapper-focus {
  border-color: var(--ft-border-strong);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--ft-primary-300) 38%, transparent),
    var(--ft-shadow-sm);
}

.ui-date-picker.ui-field--invalid {
  border-color: var(--ft-danger-500);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ft-danger-500) 18%, transparent);
}

.ui-date-picker.ui-field--invalid :deep(.p-datepicker-dropdown) {
  border-inline-start-color: color-mix(in srgb, var(--ft-danger-500) 42%, var(--ft-border-soft));
}

:deep(.p-datepicker-input) {
  width: 100%;
  min-height: calc(var(--ft-control-height) - 2px);
  padding: 0 var(--ft-space-4);

  font-size: var(--ft-text-base);
  line-height: var(--ft-leading-tight);
  color: var(--ft-text-primary);

  background: transparent;
  border: 0;
  border-radius: 0;
  outline: 0;
}

:deep(.p-datepicker-input::placeholder) {
  color: var(--ft-text-tertiary);
  opacity: 1;
}

:deep(.p-datepicker.p-disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}

:deep(.p-datepicker-dropdown) {
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
  border-radius: 0;

  transition:
    color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

:deep(.p-datepicker-dropdown svg) {
  width: 1rem;
  height: 1rem;
  transition: transform var(--ft-transition-fast);
}

.ui-date-picker:not(.p-disabled):hover :deep(.p-datepicker-dropdown) {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-surface-overlay) 65%, transparent);
}

:global(.ui-date-picker-overlay),
:global(.p-datepicker-panel) {
  isolation: isolate;
  z-index: var(--ft-z-dropdown);

  overflow: hidden;

  width: min(340px, calc(100vw - (var(--ft-space-6) * 2)));
  min-width: min(340px, calc(100vw - (var(--ft-space-6) * 2)));
  max-width: min(340px, calc(100vw - (var(--ft-space-6) * 2)));
  padding: var(--ft-space-2);

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

:global(.p-datepicker-calendar-container) {
  overflow: auto;
  max-height: min(26rem, 60vh);
  padding: var(--ft-space-1) var(--ft-space-2) var(--ft-space-2);
}

:global(.p-datepicker-calendar-container)::-webkit-scrollbar {
  width: var(--ft-scrollbar-size);
  height: var(--ft-scrollbar-size);
}

:global(.p-datepicker-calendar-container)::-webkit-scrollbar-track {
  background: var(--ft-scrollbar-track);
  border-radius: var(--ft-radius-full);
}

:global(.p-datepicker-calendar-container)::-webkit-scrollbar-thumb {
  background: var(--ft-scrollbar-thumb);
  border: 2px solid var(--ft-scrollbar-track);
  border-radius: var(--ft-radius-full);
}

:global(.p-datepicker-calendar-container)::-webkit-scrollbar-thumb:hover {
  background: var(--ft-scrollbar-thumb-hover);
}

:global(.p-datepicker-calendar-container)::-webkit-scrollbar-thumb:active {
  background: var(--ft-scrollbar-thumb-active);
}

:global(.p-datepicker-header) {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: space-between;

  margin-bottom: var(--ft-space-2);
  padding: var(--ft-space-2);

  background: color-mix(in srgb, var(--ft-surface-overlay) 82%, transparent);
  border-bottom: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-md);
}

:global(.p-datepicker-title) {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
}

:global(.p-datepicker-prev-button),
:global(.p-datepicker-next-button) {
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 2.125rem;
  min-width: 2.125rem;
  height: 2.125rem;
  min-height: 2.125rem;
  padding: 0;

  color: var(--ft-text-secondary);

  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ft-radius-md);
  box-shadow: none;

  transition:
    border-color var(--ft-transition-fast),
    color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

:global(.p-datepicker-prev-button:not(:disabled):hover),
:global(.p-datepicker-next-button:not(:disabled):hover) {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-primary-400) 16%, transparent);
  border-color: color-mix(in srgb, var(--ft-primary-400) 40%, transparent);
}

:global(.p-datepicker-select-month),
:global(.p-datepicker-select-year) {
  cursor: pointer;

  min-height: 2.125rem;
  padding: 0 var(--ft-space-2);

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);

  appearance: none;
  background: color-mix(in srgb, var(--ft-surface-base) 82%, transparent);
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-md);
}

:global(.p-datepicker-select-month:focus-visible),
:global(.p-datepicker-select-year:focus-visible) {
  border-color: var(--ft-border-strong);
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ft-focus-ring) 52%, transparent);
}

:global(.p-datepicker-calendar) {
  border-spacing: 0.25rem;
  border-collapse: separate;
  width: 100%;
}

:global(.p-datepicker-calendar th) {
  padding: var(--ft-space-1);

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

:global(.p-datepicker-day) {
  display: grid;
  place-items: center;

  width: 2.375rem;
  height: 2.375rem;
  margin: 0 auto;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);

  border: 1px solid transparent;
  border-radius: var(--ft-radius-md);

  transition:
    border-color var(--ft-transition-fast),
    color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

:global(.p-datepicker-day:not(.p-disabled):hover) {
  background: color-mix(in srgb, var(--ft-primary-400) 14%, transparent);
  border-color: color-mix(in srgb, var(--ft-primary-400) 36%, transparent);
}

:global(.p-datepicker-day-selected),
:global(.p-datepicker-day-selected-range),
:global(.p-datepicker-day.p-highlight) {
  color: var(--ft-text-inverse);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-400) 90%, var(--ft-primary-400)) 0%,
    var(--ft-primary-600) 100%
  );
  border-color: color-mix(in srgb, var(--ft-primary-200) 40%, var(--ft-primary-400));
  box-shadow: 0 4px 12px color-mix(in srgb, var(--ft-primary-600) 40%, transparent);
}

:global(.p-datepicker-day-cell.p-datepicker-today .p-datepicker-day),
:global(.p-datepicker-today > span) {
  border-color: color-mix(in srgb, var(--ft-primary-300) 55%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ft-primary-200) 35%, transparent);
}

:global(.p-datepicker-day-cell.p-datepicker-other-month .p-datepicker-day) {
  color: var(--ft-text-tertiary);
  opacity: 0.72;
}

:global(.p-datepicker-day.p-disabled) {
  opacity: 0.5;
}

:global(.p-datepicker-month-view),
:global(.p-datepicker-year-view) {
  display: grid;
  gap: var(--ft-space-1);
  margin: 0;
  padding: 0;
}

:global(.p-datepicker-month),
:global(.p-datepicker-year) {
  cursor: pointer;

  display: grid;
  place-items: center;

  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-3);

  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);

  border: 1px solid transparent;
  border-radius: var(--ft-radius-md);
}

:global(.p-datepicker-month:not(.p-disabled):hover),
:global(.p-datepicker-year:not(.p-disabled):hover) {
  background: color-mix(in srgb, var(--ft-primary-400) 14%, transparent);
  border-color: color-mix(in srgb, var(--ft-primary-400) 36%, transparent);
}

:global(.p-datepicker-month.p-datepicker-month-selected),
:global(.p-datepicker-year.p-datepicker-year-selected) {
  color: var(--ft-text-inverse);
  background: var(--ft-primary-400);
  border-color: color-mix(in srgb, var(--ft-primary-300) 45%, var(--ft-primary-400));
}

:global(.p-datepicker-buttonbar) {
  display: flex;
  gap: var(--ft-space-2);
  justify-content: flex-end;

  margin-top: var(--ft-space-2);
  padding-top: var(--ft-space-2);

  border-top: 1px solid var(--ft-border-soft);
}

:global(.p-datepicker-buttonbar .p-datepicker-today-button),
:global(.p-datepicker-buttonbar .p-datepicker-clear-button) {
  min-height: 2rem;
  padding: 0 var(--ft-space-3);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-primary);

  background: color-mix(in srgb, var(--ft-surface-base) 84%, transparent);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

:global(.p-datepicker-buttonbar .p-datepicker-today-button:not(:disabled):hover),
:global(.p-datepicker-buttonbar .p-datepicker-clear-button:not(:disabled):hover) {
  background: color-mix(in srgb, var(--ft-primary-400) 14%, transparent);
  border-color: color-mix(in srgb, var(--ft-primary-400) 42%, transparent);
}

@media (width <= 480px) {
  :global(.ui-date-picker-overlay),
  :global(.p-datepicker-panel) {
    width: calc(100vw - (var(--ft-space-4) * 2));
    min-width: calc(100vw - (var(--ft-space-4) * 2));
    max-width: calc(100vw - (var(--ft-space-4) * 2));
  }
}
</style>
