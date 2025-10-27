<script setup lang="ts">
import CategoryManager from '../components/CategoryManager.vue';
</script>

<template>
  <div class="page sectioned ft-section">
    <header class="page-head ft-card ft-card--glass">
      <span class="ft-kicker">Категории</span>
      <h1 class="ft-display ft-display--section">Структурируйте расходы и доходы под себя</h1>
      <p class="ft-text ft-text--muted">
        Системные категории остаются безопасными, а пользовательские можно добавлять и редактировать за секунды.
      </p>
    </header>

    <CategoryManager />
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
