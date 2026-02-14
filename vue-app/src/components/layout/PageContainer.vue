<template>
  <section class="page-container">
    <slot />
  </section>
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-8);

  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--ft-space-4);
}

@media (width <= 768px) {
  .page-container {
    gap: var(--ft-space-6);
    padding: var(--ft-space-2);
  }
}
</style>
