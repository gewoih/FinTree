<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useFinanceStore } from '../stores/finance'
import type { Transaction } from '../types'
import TransactionList from '../components/TransactionList.vue'
import ExpenseForm from '../components/ExpenseForm.vue'

const financeStore = useFinanceStore()
const expenseDialogVisible = ref(false)
const editingTransaction = ref<Transaction | null>(null)

const openExpenseDialog = () => {
  editingTransaction.value = null
  expenseDialogVisible.value = true
}

const handleEditTransaction = (transaction: Transaction) => {
  editingTransaction.value = transaction
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
      title="Транзакции"
      subtitle="Фильтруйте, изучайте и управляйте всеми расходами и доходами"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
        { label: 'Транзакции' }
      ]"
    >
      <template #actions>
        <Button
          label="Добавить транзакцию"
          icon="pi pi-plus"
          @click="openExpenseDialog"
        />
      </template>
    </PageHeader>

    <section class="transactions__content">
      <TransactionList
        @add-transaction="openExpenseDialog"
        @edit-transaction="handleEditTransaction"
      />
    </section>

    <ExpenseForm
      v-model:visible="expenseDialogVisible"
      :transaction="editingTransaction"
    />
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
