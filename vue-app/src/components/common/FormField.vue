<script setup lang="ts">
import { computed, useAttrs, useId, useSlots } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    for?: string;
    hint?: string;
    error?: string | string[] | null;
    required?: boolean;
    direction?: 'vertical' | 'horizontal';
    labelSrOnly?: boolean;
  }>(),
  {
    hint: undefined,
    error: null,
    required: false,
    direction: 'vertical',
    labelSrOnly: false,
  }
);

const attrs = useAttrs();
const slots = useSlots();

const hasHintSlot = computed(() => Boolean(slots.hint));
const autoId = useId?.() ?? `ff-${Math.random().toString(36).slice(2, 8)}`;

const fieldId = computed(() => props.for ?? autoId);

const errorMessages = computed(() => {
  if (!props.error) return [];
  return Array.isArray(props.error) ? props.error.filter(Boolean) : [props.error];
});

const hasHint = computed(() => Boolean(props.hint) || hasHintSlot.value);

const hintId = computed(() => (hasHint.value ? `${fieldId.value}-hint` : undefined));
const errorId = computed(() =>
  errorMessages.value.length ? `${fieldId.value}-error` : undefined
);

const describedBy = computed(() => {
  const ids: string[] = [];
  if (hintId.value) ids.push(hintId.value);
  if (errorId.value) ids.push(errorId.value);
  return ids.join(' ') || undefined;
});

const fieldState = computed(() => ({
  id: fieldId.value,
  'aria-invalid': errorMessages.value.length ? 'true' : undefined,
  'aria-describedby': describedBy.value,
}));
</script>

<template>
  <div
    class="form-field"
    :class="[`form-field--${props.direction}`, { 'form-field--error': errorMessages.length }]"
  >
    <label
      :for="fieldId"
      class="form-field__label"
      :class="{ 'sr-only': props.labelSrOnly }"
    >
      <span class="form-field__label-text">
        {{ props.label }}
        <span v-if="props.required" aria-hidden="true" class="form-field__required">*</span>
      </span>
      <slot name="label-addon" />
    </label>

    <div class="form-field__control">
      <slot :field-attrs="fieldState" />

      <p v-if="props.hint" :id="hintId" class="form-field__hint">
        {{ props.hint }}
      </p>

      <div
        v-else-if="$slots.hint"
        :id="hintId"
        class="form-field__hint"
      >
        <slot name="hint" />
      </div>

      <ul v-if="errorMessages.length" :id="errorId" class="form-field__errors">
        <li v-for="message in errorMessages" :key="message">
          {{ message }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.form-field {
  display: grid;
  gap: var(--ft-space-2);
  color: var(--ft-text-secondary);
}

.form-field--horizontal {
  align-items: center;
  grid-template-columns: minmax(120px, auto) 1fr;
  gap: var(--ft-space-3);
}

.form-field__label {
  font-weight: var(--ft-font-medium);
  font-size: var(--ft-text-sm);
  color: var(--ft-heading);
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-1);
}

.form-field__label-text {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-1);
}

.form-field__required {
  color: var(--ft-danger-600);
  font-weight: var(--ft-font-semibold);
}

.form-field__control {
  display: grid;
  gap: var(--ft-space-2);
}

.form-field__hint {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-muted);
}

.form-field__errors {
  margin: 0;
  padding-left: var(--ft-space-4);
  font-size: var(--ft-text-xs);
  color: var(--ft-danger-600);
  display: grid;
  gap: var(--ft-space-1);
}

.form-field--error .form-field__label {
  color: var(--ft-danger-600);
}

.form-field--error :deep(.p-inputtext),
.form-field--error :deep(.p-select),
.form-field--error :deep(.p-dropdown),
.form-field--error :deep(.p-inputnumber) {
  border-color: var(--ft-danger-400) !important;
}
</style>
