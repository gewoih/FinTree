<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useFinanceStore } from '../stores/finance'
import TransactionList from '../components/TransactionList.vue'
import ExpenseForm from '../components/ExpenseForm.vue'

const financeStore = useFinanceStore()
const expenseDialogVisible = ref(false)

const openExpenseDialog = () => {
  expenseDialogVisible.value = true
}

onMounted(async () => {
  await Promise.all([
    financeStore.fetchCurrencies(),
    financeStore.fetchAccounts(),
    financeStore.fetchCategories()
  ])
  await financeStore.fetchTransactions()
})
</script>

<template>
  <div class="transactions page">
    <PageHeader
      title="Transactions"
      subtitle="Filter, explore, and manage every expense and income entry"
      :breadcrumbs="[
        { label: 'Home', to: '/dashboard' },
        { label: 'Transactions' }
      ]"
    >
      <template #actions>
        <Button
          label="Add Transaction"
          icon="pi pi-plus"
          @click="openExpenseDialog"
        />
      </template>
    </PageHeader>

    <section class="transactions__content">
      <TransactionList @add-transaction="openExpenseDialog" />
    </section>

    <ExpenseForm v-model:visible="expenseDialogVisible" />
  </div>
</template>

<style scoped>
.transactions {
  gap: var(--ft-space-8);
}

.transactions__content {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
}
</style>
