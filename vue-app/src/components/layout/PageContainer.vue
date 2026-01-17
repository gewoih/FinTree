<script setup lang="ts">
</script>

<template>
  <div class="page-container">
    <slot />
  </div>
</template>

<style scoped>
.page-container {
  width: 100%;
  max-width: var(--page-max-width);
  padding: var(--page-padding);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--section-gap);
}

@media (max-width: 768px) {
  .page-container {
    padding: var(--space-4);
  }
}
</style>
