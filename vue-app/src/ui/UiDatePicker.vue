<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import DatePicker from 'primevue/datepicker';
import type { DatePickerPassThroughOptions } from 'primevue/datepicker';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
import { mergePt } from './prime/pt';

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
    unstyled: undefined,
    pt: undefined,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date[] | Date | null): void;
}>();

const attrs = useAttrs();
const isUnstyled = computed(() => resolvePrimeUnstyled('uiDatePicker', props.unstyled));
const mergedPanelClass = computed(() => ['ui-date-picker-overlay', props.panelClass]);

const mergedPt = computed(() =>
  mergePt(
    {
      root: {
        class: 'ui-date-picker__root p-datepicker p-component p-inputwrapper',
      },
      pcInputText: {
        root: {
          class: 'ui-date-picker__input p-datepicker-input p-inputtext',
        },
      },
      dropdown: {
        class: 'ui-date-picker__dropdown p-datepicker-dropdown',
      },
      panel: {
        class: 'ui-date-picker-overlay p-datepicker-panel p-component',
      },
      calendarContainer: {
        class: 'ui-date-picker__calendar-container p-datepicker-calendar-container',
      },
      calendar: {
        class: 'ui-date-picker__calendar p-datepicker-calendar',
      },
      header: {
        class: 'ui-date-picker__header p-datepicker-header',
      },
      title: {
        class: 'ui-date-picker__title p-datepicker-title',
      },
      weekDayCell: {
        class: 'ui-date-picker__week-day-cell p-datepicker-weekday-cell',
      },
      weekDay: {
        class: 'ui-date-picker__week-day p-datepicker-weekday',
      },
      dayCell: {
        class: 'ui-date-picker__day-cell p-datepicker-day-cell',
      },
      day: {
        class: 'ui-date-picker__day p-datepicker-day',
      },
      buttonbar: {
        class: 'ui-date-picker__buttonbar p-datepicker-buttonbar',
      },
    } as DatePickerPassThroughOptions,
    props.pt
  )
);
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
    :append-to="props.appendTo ?? 'body'"
    :auto-z-index="props.autoZIndex"
    :base-z-index="props.baseZIndex"
    :select-other-months="true"
    :unstyled="isUnstyled"
    :pt="mergedPt"
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
