<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useFinanceStore } from '../stores/finance'
import type { Transaction } from '../types'
import TransactionList from '../components/TransactionList.vue'
import TransactionForm from '../components/TransactionForm.vue'

const financeStore = useFinanceStore()
const transactionDialogVisible = ref(false)
const editingTransaction = ref<Transaction | null>(null)

const openTransactionDialog = () => {
  editingTransaction.value = null
  transactionDialogVisible.value = true
}

const handleEditTransaction = (transaction: Transaction) => {
  editingTransaction.value = transaction
  transactionDialogVisible.value = true
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
          @click="openTransactionDialog"
        />
      </template>
    </PageHeader>

    <section class="page-section transactions__content">
      <TransactionList
        @add-transaction="openTransactionDialog"
        @edit-transaction="handleEditTransaction"
      />
    </section>

    <TransactionForm
      v-model:visible="transactionDialogVisible"
      :transaction="editingTransaction"
    />
  </div>
</template>

<style scoped>
.transactions {
  gap: var(--ft-layout-section-gap);
}

.transactions__content {
  gap: var(--ft-layout-card-gap);
}
</style>
