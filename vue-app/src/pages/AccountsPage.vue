<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useFinanceStore } from '../stores/finance';
import AccountManager from '../components/AccountManager.vue';

const store = useFinanceStore();

onMounted(async () => {
  await store.fetchCurrencies();
  await store.fetchAccounts();
});

const accountsCount = computed(() => store.accounts.length);
const mainAccount = computed(() => store.accounts.find(a => a.isMain));

// Group accounts by currency
const accountsByCurrency = computed(() => {
  const grouped = new Map<string, { count: number; symbol: string }>();

  store.accounts.forEach(account => {
    const currency = account.currency?.code || account.currencyCode || 'KZT';
    const symbol = account.currency?.symbol || '';

    if (!grouped.has(currency)) {
      grouped.set(currency, { count: 0, symbol });
    }

    grouped.get(currency)!.count += 1;
  });

  return Array.from(grouped.entries()).map(([code, data]) => ({
    code,
    count: data.count,
    symbol: data.symbol
  }));
});
</script>

<template>
  <div class="page accounts-page ft-section">
    <!-- Stats Overview -->
    <div class="accounts-stats ft-stat-grid">
      <div class="ft-stat">
        <p class="ft-stat__label">Всего счетов</p>
        <p class="ft-stat__value">{{ accountsCount }}</p>
        <p class="ft-stat__meta">{{ accountsCount === 1 ? 'счет' : accountsCount < 5 ? 'счета' : 'счетов' }}</p>
      </div>

      <div v-for="group in accountsByCurrency" :key="group.code" class="ft-stat">
        <p class="ft-stat__label">Счета в {{ group.code }}</p>
        <p class="ft-stat__value">{{ group.count }}</p>
        <p class="ft-stat__meta">{{ group.symbol }} {{ group.code }}</p>
      </div>

      <div v-if="mainAccount" class="ft-stat">
        <p class="ft-stat__label">Основной счет</p>
        <p class="ft-stat__value">{{ mainAccount.name }}</p>
        <p class="ft-stat__meta">{{ mainAccount.currency?.code || mainAccount.currencyCode }}</p>
      </div>
    </div>

    <!-- Accounts Manager -->
    <AccountManager />
  </div>
</template>

<style scoped>
.accounts-page {
  gap: clamp(2rem, 3vw, 2.75rem);
}

.accounts-stats {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}
</style>
