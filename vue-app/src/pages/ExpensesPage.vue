<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import type { Transaction, UpdateTransferPayload } from '../types'
import TransactionList from '../components/TransactionList.vue'
import TransactionForm from '../components/TransactionForm.vue'
import TransferFormModal from '../components/TransferFormModal.vue'
import { apiService } from '../services/api.service'
import { useViewport } from '../composables/useViewport'

const financeStore = useFinanceStore()
const userStore = useUserStore()
const toast = useToast()
const router = useRouter()
const transactionDialogVisible = ref(false)
const editingTransaction = ref<Transaction | null>(null)
const transferDialogVisible = ref(false)
const editingTransfer = ref<UpdateTransferPayload | null>(null)
const isExporting = ref(false)
const actionMenuRef = ref<{ toggle: (event: Event) => void } | null>(null)
const { isMobile } = useViewport()
const isReadOnlyMode = computed(() => userStore.isReadOnlyMode)

const actionMenuItems = computed<MenuItem[]>(() => [
  {
    label: 'Перевод',
    icon: 'pi pi-arrow-right-arrow-left',
    disabled: isReadOnlyMode.value,
    command: () => openTransferDialog()
  },
  {
    label: 'Категории',
    icon: 'pi pi-tags',
    command: () => router.push('/profile#categories')
  },
  {
    label: 'Экспорт',
    icon: 'pi pi-download',
    command: () => exportTransactions()
  }
])

const toggleActionMenu = (event: Event) => {
  actionMenuRef.value?.toggle(event)
}

const openTransactionDialog = () => {
  if (isReadOnlyMode.value) return
  editingTransaction.value = null
  transactionDialogVisible.value = true
}

const openTransferDialog = () => {
  if (isReadOnlyMode.value) return
  editingTransfer.value = null
  transferDialogVisible.value = true
}

const handleEditTransaction = (transaction: Transaction) => {
  if (isReadOnlyMode.value) return
  editingTransaction.value = transaction
  transactionDialogVisible.value = true
}

const handleEditTransfer = (transfer: UpdateTransferPayload) => {
  if (isReadOnlyMode.value) return
  editingTransfer.value = transfer
  transferDialogVisible.value = true
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
})
</script>

<template>
  <PageContainer class="transactions">
    <PageHeader
      title="Транзакции"
      subtitle="Фильтруйте, изучайте и управляйте всеми расходами и доходами"
      :breadcrumbs="[
        { label: 'Главная', to: '/analytics' },
        { label: 'Транзакции' }
      ]"
    >
      <template #actions>
        <UiButton
          v-if="!isMobile"
          label="Экспорт"
          icon="pi pi-download"
          variant="ghost"
          :loading="isExporting"
          @click="exportTransactions"
        />
        <UiButton
          v-if="!isMobile"
          label="Категории"
          icon="pi pi-tags"
          variant="ghost"
          @click="router.push('/profile#categories')"
        />
        <UiButton
          v-if="!isMobile"
          label="Перевод"
          icon="pi pi-arrow-right-arrow-left"
          variant="secondary"
          :disabled="isReadOnlyMode"
          @click="openTransferDialog"
        />
        <UiButton
          label="Добавить транзакцию"
          icon="pi pi-plus"
          :disabled="isReadOnlyMode"
          @click="openTransactionDialog"
        />
        <UiButton
          v-if="isMobile"
          icon="pi pi-ellipsis-h"
          variant="ghost"
          aria-label="Дополнительные действия"
          @click="toggleActionMenu"
        />
        <Menu
          ref="actionMenuRef"
          :model="actionMenuItems"
          popup
          class="transactions__action-menu"
        />
      </template>
    </PageHeader>

    <UiSection class="transactions__content">
      <TransactionList
        :readonly="isReadOnlyMode"
        @add-transaction="openTransactionDialog"
        @edit-transaction="handleEditTransaction"
        @edit-transfer="handleEditTransfer"
      />
    </UiSection>

    <TransactionForm
      v-model:visible="transactionDialogVisible"
      :transaction="editingTransaction"
      :readonly="isReadOnlyMode"
    />

    <TransferFormModal
      v-model:visible="transferDialogVisible"
      :transfer="editingTransfer"
      :readonly="isReadOnlyMode"
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

.transactions__action-menu :deep(.p-menu) {
  min-width: 200px;
}
</style>
