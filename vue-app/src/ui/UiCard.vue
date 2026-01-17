<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'muted' | 'raised'
    padding?: 'sm' | 'md' | 'lg'
  }>(),
  {
    variant: 'default',
    padding: 'md'
  }
)
</script>

<template>
  <article class="ui-card" :class="[`ui-card--${props.variant}`, `ui-card--${props.padding}`]">
    <header v-if="$slots.header" class="ui-card__header">
      <slot name="header" />
    </header>
    <div class="ui-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="ui-card__footer">
      <slot name="footer" />
    </footer>
  </article>
</template>

<style scoped>
.ui-card {
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ui-card--muted {
  background: var(--surface-1);
}

.ui-card--raised {
  background: var(--surface-3);
}

.ui-card--sm {
  padding: var(--space-3);
}

.ui-card--md {
  padding: var(--space-4);
}

.ui-card--lg {
  padding: var(--space-5);
}

.ui-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.ui-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ui-card__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
