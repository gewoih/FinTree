<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Button from 'primevue/button';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
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
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    block: false,
  }
);

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const attrs = useAttrs();

const primeSeverity = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'primary';
    case 'secondary':
      return 'secondary';
    case 'danger':
      return 'danger';
    default:
      return undefined;
  }
});

const isText = computed(() => props.variant === 'ghost');
const isOutlined = computed(() => props.variant === 'secondary');

const buttonClasses = computed(() => [
  'app-button',
  `app-button--${props.size}`,
  `app-button--${props.variant}`,
  { 'app-button--block': props.block, 'is-loading': props.loading },
  attrs.class,
]);

const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) {
    event.preventDefault();
    return;
  }

  emit('click', event);
};

const computedAttrs = computed(() => ({
  ...attrs,
  class: undefined,
}));
</script>

<template>
  <Button
    v-bind="computedAttrs"
    :class="buttonClasses"
    :label="label"
    :icon="icon"
    :type="type"
    :loading="loading"
    :disabled="disabled || loading"
    :severity="primeSeverity"
    :text="isText"
    :outlined="isOutlined && !isText"
    :aria-busy="loading ? 'true' : undefined"
    @click="handleClick"
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
.app-button {
  --app-button-padding-y: var(--ft-space-2);
  --app-button-padding-x: var(--ft-space-4);
  --app-button-height: var(--ft-button-height-md);
  --app-button-font-size: var(--ft-text-sm);

  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: center;

  min-height: var(--app-button-height);
  padding: var(--app-button-padding-y) var(--app-button-padding-x);

  font-weight: var(--ft-font-semibold);
  letter-spacing: 0.01em;

  transition:
    transform var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    border-color var(--ft-transition-fast);
}

.app-button--sm {
  --app-button-padding-y: var(--ft-space-1);
  --app-button-padding-x: var(--ft-space-3);
  --app-button-height: var(--ft-button-height-sm);
  --app-button-font-size: var(--ft-text-xs);
}

.app-button--lg {
  --app-button-padding-y: var(--ft-space-2);
  --app-button-padding-x: var(--ft-space-5);
  --app-button-height: var(--ft-button-height-lg);
  --app-button-font-size: var(--ft-text-base);
}

.app-button--primary {
  box-shadow: var(--ft-shadow-sm);
}

.app-button--secondary {
  color: var(--ft-text-primary);
}

.app-button--ghost {
  color: var(--ft-text-primary);
}

.app-button--danger {
  box-shadow: 0 6px 16px rgb(220 38 38 / 25%);
}

.app-button--block {
  width: 100%;
}

.app-button:focus-visible {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}

.app-button:disabled {
  cursor: not-allowed;
  transform: none;
  opacity: 0.7;
  box-shadow: none;
}

.app-button.is-loading {
  pointer-events: none;
}
</style>
