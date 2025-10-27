<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import TransactionList from '../components/TransactionList.vue';
import ExpenseForm from '../components/ExpenseForm.vue';
import { useFinanceStore } from '../stores/finance';
import { formatCurrency } from '../utils/formatters';

const store = useFinanceStore();
const showExpenseDialog = ref(false);

const transactions = computed(() => store.transactions);
const primaryCurrency = computed(() => store.primaryAccount?.currency?.code ?? 'KZT');

const totalSpent = computed(() =>
  transactions.value
    .filter(txn => txn.amount < 0)
    .reduce((sum, txn) => sum + Math.abs(txn.amount), 0)
);

const totalIncome = computed(() =>
  transactions.value
    .filter(txn => txn.amount > 0)
    .reduce((sum, txn) => sum + txn.amount, 0)
);

const netFlow = computed(() => totalIncome.value - totalSpent.value);

const statTiles = computed(() => [
  {
    label: 'Всего расходов',
    value: `−${formatCurrency(totalSpent.value, primaryCurrency.value)}`,
    tone: 'negative',
  },
  {
    label: 'Доходы',
    value: `+${formatCurrency(totalIncome.value, primaryCurrency.value)}`,
    tone: 'positive',
  },
  {
    label: 'Чистый поток',
    value: `${netFlow.value >= 0 ? '+' : '−'}${formatCurrency(Math.abs(netFlow.value), primaryCurrency.value)}`,
    tone: netFlow.value >= 0 ? 'positive' : 'negative',
  },
  {
    label: 'Операций',
    value: transactions.value.length.toString(),
    helper: 'За весь период учета',
  },
]);

const scrollToFilters = () => {
  if (typeof window === 'undefined') return;
  const target = window.document.querySelector('.transaction-history');
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
</script>

<template>
  <div class="page expenses ft-section">
    <section class="expenses-hero ft-hero">
      <div class="ft-hero__content">
        <span class="ft-kicker">Расходы</span>
        <h1 class="ft-display ft-display--hero">Контроль движения средств без лишних экранов</h1>
        <p class="ft-text ft-text--muted">
          Вся история операций доступна на одном экране. Настраивайте фильтры по счетам, категориям и датам,
          а новые траты создавайте в пару кликов.
        </p>
        <div class="ft-hero__actions">
          <Button
            label="Добавить расход"
            icon="pi pi-plus"
            severity="success"
            size="large"
            @click="showExpenseDialog = true"
          />
          <Button
            label="Перейти к фильтрам"
            icon="pi pi-filter"
            size="large"
            outlined
            @click="scrollToFilters"
          />
        </div>
      </div>

      <div class="hero-stats ft-stat-grid">
        <article v-for="tile in statTiles" :key="tile.label" class="ft-stat" :class="tile.tone">
          <p class="ft-stat__label">{{ tile.label }}</p>
          <p class="ft-stat__value">{{ tile.value }}</p>
          <p v-if="tile.helper" class="ft-stat__meta">{{ tile.helper }}</p>
        </article>
      </div>
    </section>

    <section class="history-card ft-card">
      <header class="history-head">
        <div>
          <span class="ft-kicker">Лента операций</span>
          <h2 class="ft-display ft-display--section">Сводная история расходов и поступлений</h2>
          <p class="ft-text ft-text--muted">
            Пользуйтесь фильтрами и поиском, чтобы находить нужные операции. Все обновления происходят без перезагрузки страницы.
          </p>
        </div>
        <Button label="Новый расход" icon="pi pi-pencil" severity="success" @click="showExpenseDialog = true" />
      </header>

      <TransactionList />
    </section>

    <ExpenseForm v-model:visible="showExpenseDialog" />
  </div>
</template>

<style scoped>
.page.expenses {
  gap: clamp(2.5rem, 3vw, 3.5rem);
}

.hero-stats .ft-stat {
  gap: var(--ft-space-xs);
}

.ft-stat.positive .ft-stat__value {
  color: #059669;
}

.ft-stat.negative .ft-stat__value {
  color: #dc2626;
}

.history-card {
  gap: clamp(1.5rem, 2vw, 2rem);
}

.history-head {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.history-head h2 {
  margin: 0.35rem 0 0;
}

.history-head .ft-text {
  margin-top: 0.75rem;
  max-width: 640px;
}
</style>
