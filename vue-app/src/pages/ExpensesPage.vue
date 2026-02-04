<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useFinanceStore } from '../stores/finance'
import type { Transaction } from '../types'
import TransactionList from '../components/TransactionList.vue'
import TransactionForm from '../components/TransactionForm.vue'
import { apiService } from '../services/api.service'

const financeStore = useFinanceStore()
const toast = useToast()
const transactionDialogVisible = ref(false)
const editingTransaction = ref<Transaction | null>(null)
const isExporting = ref(false)

const openTransactionDialog = () => {
  editingTransaction.value = null
  transactionDialogVisible.value = true
}

const handleEditTransaction = (transaction: Transaction) => {
  editingTransaction.value = transaction
  transactionDialogVisible.value = true
}

const exportTransactions = async () => {
  if (isExporting.value) return
  isExporting.value = true
  try {
    const { blob, fileName } = await apiService.exportTransactions()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    toast.add({
      severity: 'success',
      summary: 'Экспорт завершен',
      detail: 'Файл с транзакциями сохранен.',
      life: 2500
    })
  } catch (error) {
    console.error('Не удалось экспортировать транзакции:', error)
    toast.add({
      severity: 'error',
      summary: 'Ошибка экспорта',
      detail: 'Не удалось сформировать файл.',
      life: 2500
    })
  } finally {
    isExporting.value = false
  }
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
  <PageContainer class="transactions">
    <PageHeader
      title="Транзакции"
      subtitle="Фильтруйте, изучайте и управляйте всеми расходами и доходами"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
        { label: 'Транзакции' }
      ]"
    >
      <template #actions>
        <UiButton
          label="Экспорт"
          icon="pi pi-download"
          variant="ghost"
          :loading="isExporting"
          @click="exportTransactions"
        />
        <UiButton
          label="Добавить транзакцию"
          icon="pi pi-plus"
          @click="openTransactionDialog"
        />
      </template>
    </PageHeader>

    <UiSection class="transactions__content">
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

<style scoped>
.transactions {
  gap: var(--space-6);
}

.transactions__content {
  gap: var(--space-5);
}
</style>
