<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <section class="ui-section">
    <header v-if="props.title || props.description || $slots.actions" class="ui-section__header">
      <div class="ui-section__text">
        <h2 v-if="props.title" class="ui-section__title">{{ props.title }}</h2>
        <p v-if="props.description" class="ui-section__description">{{ props.description }}</p>
      </div>
      <div v-if="$slots.actions" class="ui-section__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="ui-section__content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.ui-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ui-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.ui-section__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ui-section__title {
  margin: 0;
  font-size: 1.125rem;
  color: var(--text);
}

.ui-section__description {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.95rem;
}

.ui-section__actions {
  display: flex;
  gap: var(--space-2);
}

.ui-section__content {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
}

@media (max-width: 768px) {
  .ui-section__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
