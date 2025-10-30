<script setup lang="ts">
import { onMounted } from 'vue';
import TransactionList from '../components/TransactionList.vue';
import { useFinanceStore } from '../stores/finance';

const store = useFinanceStore();

onMounted(async () => {
  await Promise.all([
    store.fetchCurrencies(),
    store.fetchAccounts(),
    store.fetchCategories(),
  ]);
  await store.fetchTransactions();
});

</script>

<template>
  <div class="page expenses ft-section">
    <!-- Transactions History -->
    <section class="history-card ft-card">
      <header class="history-head">
        <span class="ft-kicker">Лента операций</span>
        <h2 class="ft-display ft-display--section">Сводная история расходов и поступлений</h2>
        <p class="ft-text ft-text--muted">
          Пользуйтесь фильтрами и поиском, чтобы находить нужные операции. Все обновления происходят без перезагрузки страницы.
        </p>
      </header>

      <TransactionList />
    </section>
  </div>
</template>

<style scoped>
.page.expenses {
  gap: clamp(2.5rem, 3vw, 3.5rem);
}

.history-card {
  gap: clamp(1.5rem, 2vw, 2rem);
}

.history-head {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-head h2 {
  margin: 0.35rem 0 0;
}

.history-head .ft-text {
  margin-top: 0.75rem;
  max-width: 640px;
}
</style>
