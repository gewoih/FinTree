<template>
  <section class="page-container">
    <slot />
  </section>
</template>

<style scoped>
.page-container {
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

@media (max-width: 768px) {
  .page-container {
    padding: var(--space-4);
    gap: var(--space-5);
  }
}
</style>
