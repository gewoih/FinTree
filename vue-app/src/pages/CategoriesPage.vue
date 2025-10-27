<script setup lang="ts">
import CategoryManager from '../components/CategoryManager.vue';
</script>

<template>
  <div class="page sectioned ft-section">
    <CategoryManager/>
  </div>
</template>

<style scoped>
.page.sectioned {
  gap: clamp(2rem, 2.5vw, 2.75rem);
}

.page-head {
  gap: var(--ft-space-sm);
}

.page-head p {
  margin: 0;
  max-width: 640px;
}
</style>
