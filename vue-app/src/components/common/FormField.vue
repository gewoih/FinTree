<script setup lang="ts">
import { computed } from 'vue'

let counter = 0

interface Props {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  inputId?: string
  labelSrOnly?: boolean
}

const props = defineProps<Props>()

const stableId = `field-${++counter}`
const fieldId = computed(() => props.inputId || stableId)
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
    <div
      v-if="label"
      class="form-field__label-row"
      :class="{ 'sr-only': labelSrOnly }"
    >
      <label
        :for="fieldId"
        class="form-field__label"
      >
        {{ label }}
        <span
          v-if="required"
          class="form-field__required"
          aria-label="обязательное поле"
        >*</span>
      </label>
      <button
        v-if="hint && !error && !labelSrOnly"
        type="button"
        class="form-field__info"
        aria-label="Подсказка"
      >
        <i
          class="pi pi-info"
          aria-hidden="true"
        />
      </button>
      <small
        v-if="hint && !error"
        :id="hintId"
        class="form-field__hint"
        role="note"
      >{{ hint }}</small>
    </div>

    <div class="form-field__control">
      <slot :field-attrs="fieldAttrs" />
    </div>

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

.form-field__label-row {
  position: relative;

  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  width: fit-content;
}

.form-field__label {
  display: flex;
  gap: var(--ft-space-1);
  align-items: center;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
}

.form-field__info {
  cursor: help;

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  inline-size: 18px;
  block-size: 18px;
  padding: 0;

  line-height: 1;
  color: var(--ft-text-tertiary);

  background: transparent;
  border: 1px solid var(--ft-border-subtle);
  border-radius: 50%;
}

/* Expand touch target to 44x44 while keeping visual size compact */
.form-field__info::before {
  content: '';
  position: absolute;
  inset: -13px;
}

.form-field__info i {
  font-size: 0.7rem;
  line-height: 1;
}

.form-field__info:hover,
.form-field__info:focus-visible {
  color: var(--ft-text-primary);
}

.form-field__required {
  font-weight: var(--ft-font-bold);
  color: var(--ft-danger-500);
}

.form-field__control {
  width: 100%;
}

.form-field__hint {
  pointer-events: none;

  position: absolute;
  top: 50%;
  left: 100%;
  transform: translateY(-50%);

  margin-left: var(--ft-space-2);

  font-size: 0.7rem;
  color: var(--ft-text-tertiary);
  white-space: nowrap;

  opacity: 0;

  transition:
    opacity var(--ft-transition-fast),
    transform var(--ft-transition-fast);
}

.form-field__info:hover + .form-field__hint,
.form-field__info:focus-visible + .form-field__hint {
  transform: translateY(-50%);
  opacity: 1;
}

.form-field__error {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  padding: var(--ft-space-2) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-danger-600);

  background: rgb(239 68 68 / 10%);
  border: 1px solid rgb(239 68 68 / 20%);
  border-radius: var(--ft-radius-md);
}

.dark-mode .form-field__error {
  color: var(--ft-danger-400);
  background: rgb(239 68 68 / 15%);
  border-color: rgb(239 68 68 / 30%);
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

/* Screen reader only class */
.sr-only {
  position: absolute;

  overflow: hidden;

  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;

  white-space: nowrap;

  clip-path: inset(50%);
  border-width: 0;
}

/* Accessibility: increase label size on focus */
@media (prefers-reduced-motion: no-preference) {
  .form-field:focus-within .form-field__label {
    transition: color var(--ft-transition-fast);
  }
}
</style>
