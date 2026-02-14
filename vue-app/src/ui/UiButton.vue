<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Button from 'primevue/button';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
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
  }
);

const attrs = useAttrs();

const severity = computed(() => {
  if (props.variant === 'danger') return 'danger';
  if (props.variant === 'secondary') return 'secondary';
  return 'primary';
});

const isText = computed(() => props.variant === 'ghost');
const isOutlined = computed(() => props.variant === 'secondary');

const buttonClasses = computed(() => [
  'ui-button',
  `ui-button--${props.size}`,
  `ui-button--${props.variant}`,
  { 'ui-button--block': props.block },
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
  gap: var(--space-2);
  align-items: center;
  justify-content: center;

  min-height: var(--control-height);
  padding: 0 var(--space-4);

  font-weight: 600;
  letter-spacing: 0.01em;

  border-radius: var(--radius-md);

  transition:
    transform var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    border-color var(--ft-transition-fast);
}

.ui-button--sm {
  min-height: 36px;
  padding: 0 var(--space-3);
  font-size: var(--ft-text-sm);
}

.ui-button--lg {
  min-height: 52px;
  padding: 0 var(--space-5);
  font-size: var(--ft-text-base);
}

.ui-button--primary {
  box-shadow: var(--shadow-soft);
}

.ui-button--ghost {
  color: var(--text);
}

.ui-button--secondary {
  color: var(--text);
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
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}
</style>
