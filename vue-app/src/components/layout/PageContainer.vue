<template>
  <section class="page-container">
    <slot />
  </section>
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);

  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--space-4);
}

@media (width <= 768px) {
  .page-container {
    gap: var(--space-5);
    padding: var(--space-2);
  }
}
</style>
