<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Button from 'primevue/button';
import type { ButtonPassThroughOptions } from 'primevue/button';
import { mergePt } from './prime/pt';

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
    pt?: ButtonPassThroughOptions;
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
    pt: undefined,
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
const mergedPt = computed(() =>
  mergePt(
    {
      root: {
        class: 'ui-button__root',
      },
      icon: {
        class: 'ui-button__icon',
      },
      label: {
        class: 'ui-button__label',
      },
    } as ButtonPassThroughOptions,
    props.pt
  )
);

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
    :unstyled="true"
    :rounded="rounded"
    :class="buttonClasses"
    :pt="mergedPt"
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
  cursor: pointer;

  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: center;

  min-width: fit-content;
  min-height: var(--ft-button-height-sm);
  padding: 0 var(--ft-space-4);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-inverse);
  letter-spacing: 0.01em;
  white-space: nowrap;

  background: var(--ft-primary-500);
  border: 1px solid var(--ft-primary-500);
  border-radius: var(--ft-radius-lg);
  box-shadow: var(--ft-shadow-sm);

  transition:
    transform var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    border-color var(--ft-transition-fast),
    color var(--ft-transition-fast);
}

.ui-button:hover:not(:disabled) {
  transform: translateY(-1px);
  background: var(--ft-primary-600);
  border-color: var(--ft-primary-600);
  box-shadow: var(--ft-shadow-md);
}

.ui-button:active:not(:disabled) {
  transform: translateY(0);
}

.ui-button :deep(.ui-button__icon),
.ui-button :deep(.p-button-icon) {
  margin: 0;
  font-size: 0.95rem;
}

.ui-button :deep(.ui-button__label),
.ui-button :deep(.p-button-label) {
  line-height: 1;
}

/* Icon-only buttons - ensure perfect centering */
.ui-button--icon-only {
  gap: 0;
  min-width: var(--ft-button-height-sm);
  padding: 0;
}

.ui-button--icon-only :deep(.ui-button__label),
.ui-button--icon-only :deep(.p-button-label) {
  display: none;
}

.ui-button--sm {
  min-width: var(--ft-button-height-sm);
  min-height: var(--ft-button-height-sm);
  padding: 0 var(--ft-space-3);
  font-size: var(--ft-text-sm);
}

.ui-button--md {
  min-width: var(--ft-button-height-md);
  min-height: var(--ft-button-height-md);
}

.ui-button--lg {
  min-width: var(--ft-button-height-lg);
  min-height: var(--ft-button-height-lg);
  padding: 0 var(--ft-space-6);
  font-size: var(--ft-text-base);
}

.ui-button--primary {
  color: var(--ft-text-inverse);
  background: var(--ft-primary-500);
  border-color: var(--ft-primary-500);
}

.ui-button--secondary {
  color: var(--ft-text-primary);
  background: transparent;
  border-color: var(--ft-border-default);
}

.ui-button--ghost {
  color: var(--ft-text-primary);
  background: transparent;
  border-color: transparent;
}

.ui-button--ghost:hover:not(:disabled) {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-primary-500) 12%, transparent);
  border-color: transparent;
  box-shadow: none;
}

.ui-button--secondary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ft-primary-500) 10%, transparent);
  border-color: var(--ft-border-strong);
}

.ui-button--danger {
  color: var(--ft-text-inverse);
  background: var(--ft-danger-500);
  border-color: var(--ft-danger-500);
}

.ui-button--danger:hover:not(:disabled) {
  background: var(--ft-danger-600);
  border-color: var(--ft-danger-600);
}

.ui-button--cta {
  color: var(--ft-text-inverse);
  background: linear-gradient(
    135deg,
    var(--ft-success-500),
    var(--ft-success-600)
  );
  border: 1px solid var(--ft-success-600);
  box-shadow: var(--ft-shadow-cta);
}

.ui-button--cta:hover:not(:disabled) {
  transform: translateY(-2px);
  background: linear-gradient(
    135deg,
    var(--ft-success-600),
    var(--ft-success-700)
  );
  box-shadow: var(--ft-shadow-cta-hover);
}

.ui-button--cta:active:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--ft-shadow-cta-active);
}

.ui-button--rounded {
  padding: 0;
  border-radius: var(--ft-radius-full);
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

  color: var(--ft-text-disabled);

  opacity: 0.65;
  background: color-mix(in srgb, var(--ft-surface-raised) 70%, var(--ft-bg-base));
  border-color: var(--ft-border-subtle);
  box-shadow: none;
}
</style>
