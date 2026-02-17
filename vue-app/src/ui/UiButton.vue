<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Button from 'primevue/button';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'cta';
type ButtonSize = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    label?: string;
    icon?: string;
    type?: 'button' | 'submit' | 'reset';
    loading?: boolean;
    disabled?: boolean;
    variant?: ButtonVariant;
    size?: ButtonSize;
    block?: boolean;
    rounded?: boolean;
  }>(),
  {
    label: '',
    icon: '',
    type: 'button',
    loading: false,
    disabled: false,
    variant: 'primary',
    size: 'md',
    block: false,
    rounded: false,
  }
);

const attrs = useAttrs();

const severity = computed(() => {
  if (props.variant === 'danger') return 'danger';
  if (props.variant === 'secondary') return 'secondary';
  if (props.variant === 'cta') return 'success';
  return 'primary';
});

const isText = computed(() => props.variant === 'ghost');
const isOutlined = computed(() => props.variant === 'secondary');
const isIconOnly = computed(() => props.icon && !props.label);

const buttonClasses = computed(() => [
  'ui-button',
  `ui-button--${props.size}`,
  `ui-button--${props.variant}`,
  {
    'ui-button--block': props.block,
    'ui-button--rounded': props.rounded,
    'ui-button--icon-only': isIconOnly.value
  },
]);
</script>

<template>
  <Button
    v-bind="attrs"
    :label="label"
    :icon="icon"
    :type="type"
    :loading="loading"
    :disabled="disabled || loading"
    :severity="severity"
    :text="isText"
    :outlined="isOutlined && !isText"
    :rounded="rounded"
    :class="buttonClasses"
  >
    <template
      v-if="$slots.icon"
      #icon
    >
      <slot name="icon" />
    </template>
    <template
      v-if="$slots.default"
      #default
    >
      <slot />
    </template>
  </Button>
</template>

<style scoped>
.ui-button {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: center;

  min-height: var(--ft-button-height-sm);
  padding: 0 var(--ft-space-4);

  font-weight: var(--ft-font-semibold);
  letter-spacing: 0.01em;

  border-radius: var(--ft-radius-lg);

  transition:
    transform var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    border-color var(--ft-transition-fast);
}

/* Icon-only buttons - ensure perfect centering */
.ui-button--icon-only {
  gap: 0 !important;
  padding: 0 !important;
}

.ui-button--icon-only :deep(.p-button-icon) {
  margin: 0 !important;
}

.ui-button--icon-only :deep(.p-button-label) {
  display: none;
}

.ui-button--sm {
  min-height: var(--ft-button-height-sm);
  padding: 0 var(--ft-space-3);
  font-size: var(--ft-text-sm);
}

.ui-button--lg {
  min-height: var(--ft-button-height-lg);
  padding: 0 var(--ft-space-6);
  font-size: var(--ft-text-base);
}

.ui-button--primary {
  box-shadow: var(--ft-shadow-md);
}

.ui-button--ghost {
  color: var(--ft-text-primary);
}

.ui-button--secondary {
  color: var(--ft-text-primary);
}

.ui-button--cta {
  color: var(--ft-text-inverse);
  background: linear-gradient(
    135deg,
    var(--ft-success-500),
    var(--ft-success-600)
  );
  border: 1px solid var(--ft-success-600);
  box-shadow: 0 8px 20px rgb(34 197 94 / 30%);
}

.ui-button--cta:hover:not(:disabled) {
  transform: translateY(-2px);
  background: linear-gradient(
    135deg,
    var(--ft-success-600),
    var(--ft-success-700)
  );
  box-shadow: 0 12px 28px rgb(34 197 94 / 40%);
}

.ui-button--cta:active:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgb(34 197 94 / 30%);
}

.light-mode .ui-button--cta {
  box-shadow: 0 8px 20px rgb(34 197 94 / 25%);
}

.light-mode .ui-button--cta:hover:not(:disabled) {
  box-shadow: 0 12px 28px rgb(34 197 94 / 35%);
}

.ui-button--rounded {
  padding: 0;
  border-radius: 50%;
}

.ui-button--block {
  width: 100%;
}

.ui-button:focus-visible {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}

.ui-button:disabled {
  cursor: not-allowed;
  transform: none;
  opacity: 0.7;
  box-shadow: none;
}
</style>
