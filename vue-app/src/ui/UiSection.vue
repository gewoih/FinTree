<template>
  <section class="ui-section">
    <slot />
  </section>
</template>

<style scoped>
.ui-section {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
}
</style>
