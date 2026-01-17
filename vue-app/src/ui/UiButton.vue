<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';

interface Props {
  label?: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  block: false,
  type: 'button'
});

const isGhost = computed(() => props.variant === 'ghost');
const isSecondary = computed(() => props.variant === 'secondary');
</script>

<template>
  <Button
    :label="label"
    :icon="icon"
    :loading="loading"
    :disabled="disabled"
    :type="type"
    :text="isGhost"
    :outlined="isSecondary"
    class="ui-button"
    :class="[
      `ui-button--${variant}`,
      `ui-button--${size}`,
      { 'ui-button--block': block }
    ]"
    v-bind="$attrs"
  >
    <slot />
  </Button>
</template>

<style scoped>
.ui-button {
  font-weight: 600;
  border-radius: var(--radius-md);
  height: var(--control-height);
  gap: var(--space-2);
}

.ui-button--block {
  width: 100%;
}

.ui-button--primary {
  background: var(--accent);
  border-color: var(--accent);
}

.ui-button--secondary {
  border-color: var(--border);
  color: var(--text);
}

.ui-button--ghost {
  color: var(--text);
}

.ui-button--sm {
  height: 36px;
  font-size: 0.875rem;
}

.ui-button--md {
  font-size: 0.95rem;
}
</style>
