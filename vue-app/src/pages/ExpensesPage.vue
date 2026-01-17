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
  <PageContainer>
    <PageHeader
      title="Транзакции"
      description="Фильтруйте, изучайте и управляйте всеми расходами и доходами"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
        { label: 'Транзакции' }
      ]"
    >
      <template #actions>
        <UiButton
          label="Добавить транзакцию"
          icon="pi pi-plus"
          @click="openTransactionDialog"
        />
      </template>
    </PageHeader>

    <UiSection gap="lg">
      <TransactionList
        @add-transaction="openTransactionDialog"
        @edit-transaction="handleEditTransaction"
      />
    </UiSection>

    <TransactionForm
      v-model:visible="transactionDialogVisible"
      :transaction="editingTransaction"
    />
  </PageContainer>
</template>
