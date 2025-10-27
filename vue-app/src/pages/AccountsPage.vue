<script setup lang="ts">
import AccountManager from '../components/AccountManager.vue';
</script>

<template>
  <div class="page sectioned">
    <header class="page-head">
      <span class="page-tag">Счета</span>
      <h1>Управляйте всеми счетами из одного места</h1>
      <p>
        Создавайте новые счета, отмечайте главный и следите за валютой — данные синхронизируются с сервером автоматически.
      </p>
    </header>

    <AccountManager />
  </div>
</template>

<style scoped>
.page.sectioned {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.page-head {
  background: var(--ft-surface-elevated);
  border-radius: 22px;
  padding: 2rem;
  border: 1px solid var(--ft-border-soft);
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.page-tag {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.75rem;
  color: var(--ft-accent);
  font-weight: 600;
}

.page-head h1 {
  margin: 0;
  font-size: clamp(1.8rem, 2.5vw, 2.2rem);
  color: var(--ft-heading);
}

.page-head p {
  margin: 0;
  color: var(--ft-text-muted);
  max-width: 640px;
}
</style>
