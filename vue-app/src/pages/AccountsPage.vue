<script setup lang="ts">
import AccountManager from '../components/AccountManager.vue';
</script>

<template>
  <div class="page sectioned ft-section">
    <header class="page-head ft-card ft-card--glass">
      <span class="ft-kicker">Счета</span>
      <h1 class="ft-display ft-display--section">Управляйте всеми счетами из одного места</h1>
      <p class="ft-text ft-text--muted">
        Создавайте новые счета, отмечайте главный и следите за валютой — данные синхронизируются с сервером автоматически.
      </p>
    </header>

    <AccountManager />
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
