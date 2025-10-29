<script setup lang="ts">
import { onMounted } from 'vue';
import { useFinanceStore } from '../stores/finance';
import AccountManager from '../components/AccountManager.vue';

const store = useFinanceStore();

onMounted(() => {
  store.fetchCurrencies();
  store.fetchAccounts();
});
</script>

<template>
  <div class="page sectioned ft-section">
    <AccountManager/>
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
