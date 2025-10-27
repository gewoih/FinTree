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
  <div class="page expenses">
    <section class="expenses-hero">
      <div class="hero-copy">
        <span class="hero-tag">Расходы</span>
        <h1>Контроль движения средств без лишних экранов</h1>
        <p>
          Вся история операций доступна на одном экране. Настраивайте фильтры по счетам, категориям и датам,
          а новые траты создавайте в пару кликов.
        </p>
        <div class="hero-actions">
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

      <div class="hero-stats">
        <article v-for="tile in statTiles" :key="tile.label" class="hero-stat" :class="tile.tone">
          <p class="hero-stat__label">{{ tile.label }}</p>
          <h3>{{ tile.value }}</h3>
          <small v-if="tile.helper">{{ tile.helper }}</small>
        </article>
      </div>
    </section>

    <section class="history-card">
      <header class="history-head">
        <div>
          <p class="section-kicker">Лента операций</p>
          <h2>Сводная история расходов и поступлений</h2>
          <p class="muted">
            Пользуйтесь поиском и фильтрами сверху, чтобы находить нужные операции. Все обновления происходят без перезагрузки страницы.
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
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.expenses-hero {
  display: grid;
  gap: 2rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items: stretch;
}

.hero-copy {
  border-radius: 28px;
  padding: 2.4rem;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(59, 130, 246, 0.1));
  box-shadow: 0 28px 56px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.hero-tag {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.75rem;
  color: var(--ft-accent);
  font-weight: 600;
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(1.9rem, 2.8vw, 2.5rem);
  color: var(--ft-heading);
}

.hero-copy p {
  margin: 0;
  color: var(--ft-text-muted);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.35rem;
}

.hero-stats {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.hero-stat {
  background: var(--ft-surface-elevated);
  border-radius: 22px;
  padding: 1.6rem;
  border: 1px solid var(--ft-border-soft);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hero-stat.positive h3 {
  color: #059669;
}

.hero-stat.negative h3 {
  color: #dc2626;
}

.hero-stat__label {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.75rem;
  color: var(--ft-text-muted);
}

.hero-stat h3 {
  margin: 0;
  font-size: 1.75rem;
  color: var(--ft-heading);
}

.hero-stat small {
  color: var(--ft-text-muted);
}

.history-card {
  border-radius: 28px;
  padding: 2rem 2.2rem;
  background: var(--ft-surface-elevated);
  border: 1px solid var(--ft-border-soft);
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.history-head {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.section-kicker {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ft-text-muted);
  font-weight: 600;
}

.history-head h2 {
  margin: 0.4rem 0 0;
  color: var(--ft-heading);
  font-size: clamp(1.6rem, 2.3vw, 2.1rem);
}

.muted {
  margin: 0.75rem 0 0;
  color: var(--ft-text-muted);
  max-width: 640px;
}

@media (max-width: 768px) {
  .history-card {
    padding: 1.6rem;
  }
}
</style>
