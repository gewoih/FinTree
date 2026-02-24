<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import type { Transaction, UpdateTransferPayload } from '../types'
import TransactionList from '../components/TransactionList.vue'
import TransactionForm from '../components/TransactionForm.vue'
import UiButton from '../ui/UiButton.vue'
import Skeleton from 'primevue/skeleton';
import PageContainer from '../components/layout/PageContainer.vue'
import PageHeader from '../components/common/PageHeader.vue'

const financeStore = useFinanceStore()
const userStore = useUserStore()
const transactionDialogVisible = ref(false)
const editingTransaction = ref<Transaction | null>(null)
const editingTransfer = ref<UpdateTransferPayload | null>(null)
const isReadOnlyMode = computed(() => userStore.isReadOnlyMode)
const isFinanceReady = computed(() => financeStore.areAccountsReady && financeStore.areCategoriesReady)

const openTransactionDialog = () => {
  if (isReadOnlyMode.value) return
  editingTransaction.value = null
  editingTransfer.value = null
  transactionDialogVisible.value = true
}

const handleEditTransaction = (transaction: Transaction) => {
  if (isReadOnlyMode.value) return
  editingTransaction.value = transaction
  editingTransfer.value = null
  transactionDialogVisible.value = true
}

const handleEditTransfer = (transfer: UpdateTransferPayload) => {
  if (isReadOnlyMode.value) return
  editingTransfer.value = transfer
  editingTransaction.value = null
  transactionDialogVisible.value = true
}

onMounted(async () => {
  await Promise.all([
    financeStore.fetchCurrencies(),
    financeStore.fetchAccounts(),
    financeStore.fetchCategories()
  ])
})
</script>

<template>
  <PageContainer class="transactions">
    <PageHeader title="Транзакции">
      <template #actions>
        <UiButton
          label="Добавить"
          icon="pi pi-plus"
          variant="primary"
          :disabled="isReadOnlyMode"
          @click="openTransactionDialog"
        />
      </template>
    </PageHeader>

    <section class="transactions__content">
      <div
        v-if="!isFinanceReady"
        class="transactions__skeleton"
      >
        <Skeleton
          v-for="i in 6"
          :key="i"
          height="56px"
        />
      </div>
      <TransactionList
        v-else
        :readonly="isReadOnlyMode"
        @add-transaction="openTransactionDialog"
        @edit-transaction="handleEditTransaction"
        @edit-transfer="handleEditTransfer"
      />
    </section>

    <TransactionForm
      v-model:visible="transactionDialogVisible"
      :transaction="editingTransaction"
      :transfer="editingTransfer"
      :readonly="isReadOnlyMode"
    />
  </PageContainer>
</template>

<style scoped>
.transactions {
  gap: var(--ft-space-8);
}

.transactions__content {
  gap: var(--ft-space-6);
}

.transactions__skeleton {
  display: grid;
  gap: var(--ft-space-3);
}
</style>
