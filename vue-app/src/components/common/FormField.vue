<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  inputId?: string
  labelSrOnly?: boolean
}

const props = defineProps<Props>()

const fieldId = computed(() => props.inputId || `field-${Math.random().toString(36).substr(2, 9)}`)
const hintId = computed(() => `${fieldId.value}-hint`)
const errorId = computed(() => `${fieldId.value}-error`)

const fieldAttrs = computed(() => ({
  id: fieldId.value,
  'aria-describedby': props.hint && !props.error ? hintId.value : props.error ? errorId.value : undefined,
  'aria-invalid': props.error ? 'true' : undefined,
  'aria-required': props.required ? 'true' : undefined,
}))
</script>

<template>
  <div
    class="form-field"
    :class="{ 'form-field--error': error, 'form-field--required': required }"
  >
    <label
      v-if="label"
      :for="fieldId"
      class="form-field__label"
      :class="{ 'sr-only': labelSrOnly }"
    >
      {{ label }}
      <span
        v-if="required"
        class="form-field__required"
        aria-label="обязательное поле"
      >*</span>
    </label>

    <div class="form-field__control">
      <slot :field-attrs="fieldAttrs" />
    </div>

    <small
      v-if="hint && !error"
      :id="hintId"
      class="form-field__hint"
    >{{ hint }}</small>
    <small
      v-if="error"
      :id="errorId"
      class="form-field__error"
      role="alert"
      aria-live="polite"
    >
      <i
        class="pi pi-exclamation-circle"
        aria-hidden="true"
      />
      {{ error }}
    </small>
  </div>
</template>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.form-field__label {
  font-weight: var(--ft-font-semibold);
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--ft-space-1);
}

.form-field__required {
  color: var(--ft-danger-500);
  font-weight: var(--ft-font-bold);
}

.form-field__control {
  width: 100%;
}

.form-field__hint {
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-sm);
  line-height: var(--ft-leading-normal);
}

.form-field__error {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  color: var(--ft-danger-600);
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  padding: var(--ft-space-2) var(--ft-space-3);
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--ft-radius-md);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.dark-mode .form-field__error {
  color: var(--ft-danger-400);
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}

.form-field__error i {
  flex-shrink: 0;
}

/* Focus state for field */
.form-field:focus-within .form-field__label {
  color: var(--ft-text-primary);
}

/* Error state adjustments */
.form-field--error .form-field__label {
  color: var(--ft-danger-600);
}

.dark-mode .form-field--error .form-field__label {
  color: var(--ft-danger-400);
}

/* Accessibility: increase label size on focus */
@media (prefers-reduced-motion: no-preference) {
  .form-field:focus-within .form-field__label {
    transition: color var(--ft-transition-fast);
  }
}

/* Screen reader only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
