<script setup lang="ts">
type CardVariant = 'default' | 'muted' | 'outlined';
type CardPadding = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    variant?: CardVariant;
    padding?: CardPadding;
  }>(),
  {
    variant: 'default',
    padding: 'md',
  }
);
</script>

<template>
  <article
    class="ui-card"
    :class="[`ui-card--${props.variant}`, `ui-card--${props.padding}`]"
  >
    <header
      v-if="$slots.header"
      class="ui-card__header"
    >
      <slot name="header" />
    </header>
    <div class="ui-card__body">
      <slot />
    </div>
    <footer
      v-if="$slots.footer"
      class="ui-card__footer"
    >
      <slot name="footer" />
    </footer>
  </article>
</template>

<style scoped>
.ui-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  background: var(--ft-surface-raised);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-xl);
  box-shadow: var(--ft-shadow-md);
}

.ui-card--muted {
  background: var(--ft-surface-base);
}

.ui-card--outlined {
  background: transparent;
  box-shadow: none;
}

.ui-card--sm {
  padding: var(--ft-space-3);
}

.ui-card--md {
  padding: var(--ft-space-4);
}

.ui-card--lg {
  padding: var(--ft-space-6);
}

.ui-card__header {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;
}

.ui-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.ui-card__footer {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: flex-end;
}
</style>
