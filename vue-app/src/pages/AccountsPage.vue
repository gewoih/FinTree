<script setup lang="ts">
import {onMounted} from 'vue';
import {useFinanceStore} from '../stores/finance';
import AccountManager from '../components/AccountManager.vue';

const store = useFinanceStore();

onMounted(async () => {
  await store.fetchCurrencies();
  await store.fetchAccounts();
});

</script>

<template>
  <div class="page accounts-page ft-section">
    <!-- Accounts Manager -->
    <AccountManager/>
  </div>
</template>

<style scoped>
.accounts-page {
  gap: clamp(2rem, 3vw, 2.75rem);
}
</style>
