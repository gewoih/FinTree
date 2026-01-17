<script setup lang="ts">
interface Props {
  variant?: 'default' | 'muted';
  padding?: 'md' | 'lg';
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md'
});
</script>

<template>
  <section class="ui-card" :class="[`ui-card--${variant}`, `ui-card--${padding}`]">
    <header v-if="$slots.header" class="ui-card__header">
      <slot name="header" />
    </header>
    <div class="ui-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="ui-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.ui-card {
  border-radius: var(--radius-lg);
  background: var(--surface-2);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ui-card--muted {
  background: var(--surface-1);
}

.ui-card--md {
  padding: var(--space-5);
}

.ui-card--lg {
  padding: var(--space-6);
}

.ui-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.ui-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ui-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
