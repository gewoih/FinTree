<script setup lang="ts">
interface Props {
  gap?: 'sm' | 'md' | 'lg';
}

withDefaults(defineProps<Props>(), {
  gap: 'md'
});
</script>

<template>
  <section class="ui-section" :class="`ui-section--${gap}`">
    <slot />
  </section>
</template>

<style scoped>
.ui-section {
  display: flex;
  flex-direction: column;
}

.ui-section--sm {
  gap: var(--space-4);
}

.ui-section--md {
  gap: var(--space-5);
}

.ui-section--lg {
  gap: var(--space-6);
}
</style>
