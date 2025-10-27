<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import TransactionList from '../components/TransactionList.vue';
import ExpenseForm from '../components/ExpenseForm.vue';

const showExpenseDialog = ref(false);

</script>

<template>
  <div class="page expenses ft-section">
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
