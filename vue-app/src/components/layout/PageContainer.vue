<script setup lang="ts">
interface Props {
  fullWidth?: boolean;
}

withDefaults(defineProps<Props>(), {
  fullWidth: false
});
</script>

<template>
  <div class="page-container" :class="{ 'page-container--full': fullWidth }">
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

.page-container--full {
  max-width: none;
}
</style>
