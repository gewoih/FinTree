<script setup lang="ts">
import { computed, useAttrs } from 'vue';

type CardVariant = 'soft' | 'muted' | 'outlined' | 'ghost';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    as?: string;
    variant?: CardVariant;
    padding?: CardPadding;
    elevated?: boolean;
  }>(),
  {
    as: 'section',
    variant: 'soft',
    padding: 'md',
    elevated: false,
  }
);

const attrs = useAttrs();

const classes = computed(() => [
  'app-card',
  `app-card--${props.variant}`,
  `app-card--${props.padding}`,
  { 'app-card--elevated': props.elevated },
  attrs.class,
]);

const computedAttrs = computed(() => ({
  ...attrs,
  class: undefined,
}));
</script>

<template>
  <component
    :is="props.as"
    v-bind="computedAttrs"
    :class="classes"
  >
    <header
      v-if="$slots.header"
      class="app-card__header"
    >
      <slot name="header" />
    </header>

    <div class="app-card__body">
      <slot />
    </div>

    <footer
      v-if="$slots.footer"
      class="app-card__footer"
    >
      <slot name="footer" />
    </footer>
  </component>
</template>

<style scoped>
.app-card {
  --app-card-padding-x: clamp(var(--ft-space-5), 2vw, var(--ft-space-6));
  --app-card-padding-y: clamp(var(--ft-space-4), 2vw, var(--ft-space-5));

  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  background: var(--ft-surface-soft);
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-xl);

  transition:
    box-shadow var(--ft-transition-fast),
    transform var(--ft-transition-fast),
    border-color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

.app-card--muted {
  background: var(--ft-surface-muted);
}

.app-card--outlined {
  background: var(--ft-surface-base);
  border-color: var(--ft-border-default);
}

.app-card--ghost {
  background: transparent;
  border-color: var(--ft-app-card-ghost-border-color);
  box-shadow: none;
}

.app-card--elevated {
  box-shadow: var(--ft-shadow-card);
}

.app-card--none {
  --app-card-padding-x: 0;
  --app-card-padding-y: 0;
}

.app-card--sm {
  --app-card-padding-x: var(--ft-space-4);
  --app-card-padding-y: var(--ft-space-4);
}

.app-card--md {
  --app-card-padding-x: clamp(var(--ft-space-5), 2vw, var(--ft-space-6));
  --app-card-padding-y: clamp(var(--ft-space-4), 2vw, var(--ft-space-5));
}

.app-card--lg {
  --app-card-padding-x: clamp(var(--ft-space-6), 3vw, var(--ft-space-7));
  --app-card-padding-y: clamp(var(--ft-space-5), 3vw, var(--ft-space-7));
}

.app-card__header {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
  padding: var(--app-card-padding-y) var(--app-card-padding-x) 0;
}

.app-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  padding: var(--app-card-padding-y) var(--app-card-padding-x);
}

.app-card__footer {
  display: flex;
  gap: var(--ft-space-3);
  justify-content: flex-end;

  margin-top: auto;
  padding: 0 var(--app-card-padding-x) var(--app-card-padding-y);
}

.app-card:focus-within {
  border-color: var(--ft-primary-500);
  box-shadow: 0 0 0 3px var(--ft-focus-ring);
}
</style>
