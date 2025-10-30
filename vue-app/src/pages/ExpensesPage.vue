<script setup lang="ts">
import { onMounted, computed } from 'vue';
import TransactionList from '../components/TransactionList.vue';
import { useFinanceStore } from '../stores/finance';
import { formatCurrency } from '../utils/formatters';

const store = useFinanceStore();

onMounted(async () => {
  await Promise.all([
    store.fetchCurrencies(),
    store.fetchAccounts(),
    store.fetchCategories(),
  ]);
  await store.fetchTransactions();
});

// Calculate statistics for current month
const currentMonthStats = computed(() => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthTransactions = store.transactions.filter(txn => {
    const txnDate = new Date(txn.occurredAt);
    return txnDate >= startOfMonth && txnDate <= endOfMonth;
  });

  // Group by currency
  const stats = new Map<string, { expenses: number; count: number; symbol: string }>();

  monthTransactions.forEach(txn => {
    const currency = txn.account?.currency?.code || txn.account?.currencyCode || 'KZT';
    const symbol = txn.account?.currency?.symbol || '';
    const amount = Math.abs(Number(txn.amount));

    if (!stats.has(currency)) {
      stats.set(currency, { expenses: 0, count: 0, symbol });
    }

    const current = stats.get(currency)!;
    current.expenses += amount;
    current.count += 1;
  });

  return Array.from(stats.entries()).map(([code, data]) => ({
    code,
    expenses: data.expenses,
    count: data.count,
    symbol: data.symbol,
    average: data.count > 0 ? data.expenses / data.count : 0
  }));
});

const totalTransactionsCount = computed(() => store.transactions.length);

const currentMonthName = computed(() => {
  return new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
});
</script>

<template>
  <div class="page expenses ft-section">
    <!-- Monthly Statistics -->
    <div class="expenses-stats ft-stat-grid">
      <div class="ft-stat">
        <p class="ft-stat__label">Всего транзакций</p>
        <p class="ft-stat__value">{{ totalTransactionsCount }}</p>
        <p class="ft-stat__meta">за всё время</p>
      </div>

      <template v-for="stat in currentMonthStats" :key="stat.code">
        <div class="ft-stat">
          <p class="ft-stat__label">Расходы за {{ currentMonthName }}</p>
          <p class="ft-stat__value negative">{{ formatCurrency(stat.expenses, stat.code) }}</p>
          <p class="ft-stat__meta">{{ stat.count }} {{ stat.count === 1 ? 'транзакция' : stat.count < 5 ? 'транзакции' : 'транзакций' }}</p>
        </div>

        <div class="ft-stat">
          <p class="ft-stat__label">Средний расход ({{ stat.code }})</p>
          <p class="ft-stat__value">{{ formatCurrency(stat.average, stat.code) }}</p>
          <p class="ft-stat__meta">{{ stat.symbol }}</p>
        </div>
      </template>
    </div>

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

.expenses-stats {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.ft-stat__value.negative {
  color: #ef4444;
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
