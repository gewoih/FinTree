<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import Button from 'primevue/button'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    label?: string
    icon?: string
    iconPos?: 'left' | 'right' | 'top' | 'bottom'
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button'
  }
)

const attrs = useAttrs()

const buttonClass = computed(() => [
  'ui-button',
  `ui-button--${props.variant}`,
  `ui-button--${props.size}`,
  { 'ui-button--block': props.block }
])

const severity = computed(() => (props.variant === 'primary' ? 'primary' : 'secondary'))
const isText = computed(() => props.variant === 'ghost')
const isOutlined = computed(() => props.variant === 'secondary')
</script>

<template>
  <Button
    v-bind="attrs"
    :class="buttonClass"
    :label="props.label"
    :icon="props.icon"
    :iconPos="props.iconPos"
    :loading="props.loading"
    :disabled="props.disabled"
    :type="props.type"
    :severity="severity"
    :text="isText"
    :outlined="isOutlined"
  >
    <slot />
  </Button>
</template>

<style scoped>
.ui-button {
  min-height: var(--control-height);
  border-radius: var(--radius-md);
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: none;
}

.ui-button--primary {
  background: var(--accent);
  border-color: transparent;
}

.ui-button--primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.ui-button--secondary {
  background: transparent;
  border-color: var(--border);
  color: var(--text);
}

.ui-button--secondary:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--text);
}

.ui-button--ghost {
  color: var(--text-muted);
}

.ui-button--ghost:hover:not(:disabled) {
  color: var(--text);
  background: rgba(59, 130, 246, 0.08);
}

.ui-button--sm {
  min-height: 36px;
  font-size: 0.85rem;
}

.ui-button--lg {
  min-height: 52px;
  font-size: 1rem;
}

.ui-button--block {
  width: 100%;
  justify-content: center;
}
</style>
