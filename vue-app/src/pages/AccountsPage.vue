<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import AccountFormModal from '../components/AccountFormModal.vue'
import AccountCard from '../components/AccountCard.vue'
import AccountFilters from '../components/AccountFilters.vue'
import AccountBalanceAdjustmentsModal from '../components/AccountBalanceAdjustmentsModal.vue'
import type { Account, AccountType } from '../types'

const financeStore = useFinanceStore()
const userStore = useUserStore()
const toast = useToast()
const confirm = useConfirm()

const modalVisible = ref(false)
const editingAccount = ref<Account | null>(null)
const pendingPrimaryId = ref<string | null>(null)
const pendingLiquidityId = ref<string | null>(null)
const adjustmentsVisible = ref(false)
const selectedAccount = ref<Account | null>(null)

// Filter state
const searchText = ref('')
const selectedType = ref<AccountType | null>(null)

const allAccounts = computed(() =>
  (financeStore.accounts ?? []).filter(account => account.type === 0)
)
const loadingAccounts = computed(() => financeStore.areAccountsLoading)
const loadingCurrencies = computed(() => financeStore.areCurrenciesLoading)

// Filtered accounts
const filteredAccounts = computed(() => {
  let result = allAccounts.value

  // Filter by search text
  if (searchText.value.trim()) {
    const search = searchText.value.toLowerCase().trim()
    result = result.filter(account =>
      account.name.toLowerCase().includes(search) ||
      account.currencyCode.toLowerCase().includes(search) ||
      account.currency?.name.toLowerCase().includes(search)
    )
  }

  // Filter by account type
  if (selectedType.value !== null) {
    result = result.filter(account => account.type === selectedType.value)
  }

  return result
})

const hasActiveFilters = computed(() =>
  searchText.value.length > 0 || selectedType.value !== null
)

const openModal = () => {
  editingAccount.value = null
  modalVisible.value = true
}

const openAdjustments = (account: Account) => {
  selectedAccount.value = account
  adjustmentsVisible.value = true
}

const handleSetPrimary = async (accountId: string) => {
  pendingPrimaryId.value = accountId
  try {
    const success = await financeStore.setPrimaryAccount(accountId)
    toast.add({
      severity: success ? 'success' : 'error',
      summary: success ? 'Основной счет обновлен' : 'Не удалось обновить счет',
      detail: success
        ? 'Этот счет теперь используется по умолчанию для аналитики.'
        : 'Пожалуйста, попробуйте еще раз.',
      life: 3000
    })
  } finally {
    pendingPrimaryId.value = null
  }
}

const handleEditAccount = (account: Account) => {
  editingAccount.value = account
  modalVisible.value = true
}

const handleLiquidityToggle = async (account: Account, value: boolean) => {
  if (pendingLiquidityId.value) return
  pendingLiquidityId.value = account.id
  try {
    const success = await financeStore.updateAccountLiquidity(account.id, value)
    if (!success) {
      toast.add({
        severity: 'error',
        summary: 'Не удалось обновить',
        detail: 'Попробуйте еще раз.',
        life: 2500
      })
    }
  } finally {
    pendingLiquidityId.value = null
  }
}

const handleDeleteAccount = (account: Account) => {
  confirm.require({
    message: `Вы уверены, что хотите удалить счет "${account.name}"? Все связанные транзакции также будут удалены.`,
    header: 'Подтверждение удаления',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Отмена',
    acceptLabel: 'Удалить',
    acceptClass: 'p-button-danger',
    accept: async () => {
      const success = await financeStore.deleteAccount(account.id)
      toast.add({
        severity: success ? 'success' : 'error',
        summary: success ? 'Счет удален' : 'Ошибка удаления',
        detail: success ? 'Счет и связанные транзакции удалены.' : 'Не удалось удалить счет. Попробуйте позже.',
        life: 3000
      })
    }
  })
}

const clearFilters = () => {
  searchText.value = ''
  selectedType.value = null
}

onMounted(async () => {
  await userStore.fetchCurrentUser()
  await Promise.all([
    financeStore.fetchCurrencies(),
    financeStore.fetchAccounts()
  ])
  selectedType.value = null
})
</script>

<template>
  <PageContainer class="accounts">
    <PageHeader
      title="Счета"
      subtitle="Управляйте банковскими счетами и картами в одном месте"
      :breadcrumbs="[
        { label: 'Главная', to: '/analytics' },
        { label: 'Счета' }
      ]"
    >
      <template #actions>
        <UiButton
          label="Добавить счет"
          icon="pi pi-plus"
          @click="openModal"
        />
      </template>
    </PageHeader>

    <UiSection class="accounts__content">
      <!-- Filters -->
      <UiCard
        v-if="allAccounts.length > 0"
        class="accounts__filters"
        variant="muted"
        padding="lg"
      >
        <AccountFilters
          v-model:search-text="searchText"
          v-model:selected-type="selectedType"
          :available-types="[0]"
          @clear-filters="clearFilters"
        />
      </UiCard>

      <!-- Loading skeleton -->
      <div
        v-if="loadingAccounts && allAccounts.length === 0"
        class="accounts__skeleton"
      >
        <UiSkeleton
          v-for="i in 4"
          :key="i"
          height="220px"
          class="account-skeleton"
        />
      </div>

      <!-- Empty state (no accounts at all) -->
      <EmptyState
        v-else-if="allAccounts.length === 0"
        icon="pi-wallet"
        title="Нет подключенных счетов"
        description="Добавьте банковский счет или кошелек, чтобы начать отслеживать ваши финансы."
        action-label="Добавить счет"
        action-icon="pi pi-plus"
        @action="openModal"
      />

      <!-- Empty state (no accounts match filters) -->
      <EmptyState
        v-else-if="filteredAccounts.length === 0 && hasActiveFilters"
        icon="pi-filter-slash"
        title="Ничего не найдено"
        description="По вашему запросу не найдено ни одного счета. Попробуйте изменить фильтры."
        action-label="Сбросить фильтры"
        action-icon="pi pi-refresh"
        @action="clearFilters"
      />

      <!-- Accounts grid -->
      <div
        v-else
        class="accounts-grid card-grid card-grid--balanced"
      >
        <AccountCard
          v-for="account in filteredAccounts"
          :key="account.id"
          :account="account"
          :is-primary-loading="pendingPrimaryId === account.id"
          :is-liquidity-loading="pendingLiquidityId === account.id"
          @set-primary="handleSetPrimary(account.id)"
          @edit="handleEditAccount(account)"
          @delete="handleDeleteAccount(account)"
          @open="openAdjustments(account)"
          @update-liquidity="handleLiquidityToggle(account, $event)"
        />
      </div>

      <!-- Results count -->
      <div
        v-if="filteredAccounts.length > 0 && hasActiveFilters"
        class="surface-panel accounts__results"
      >
        <p class="results-text">
          <i
            class="pi pi-info-circle"
            aria-hidden="true"
          />
          Показано счетов: <strong>{{ filteredAccounts.length }}</strong> из <strong>{{ allAccounts.length }}</strong>
        </p>
      </div>
    </UiSection>

    <AccountFormModal
      v-model:visible="modalVisible"
      :account="editingAccount"
    />
    <AccountBalanceAdjustmentsModal
      v-model:visible="adjustmentsVisible"
      :account="selectedAccount"
    />
    <UiSkeleton
      v-if="loadingCurrencies"
      class="visually-hidden"
      height="0"
    />
  </PageContainer>
</template>

<style scoped>
.accounts {
  gap: var(--space-6);
}

.accounts__content {
  gap: var(--space-5);
}

.accounts__skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-4);
}

.accounts-grid {
  gap: var(--space-5);
}

.accounts__results {
  padding: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.results-text {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--text-muted);
}

.results-text i {
  color: var(--accent);
}

.results-text strong {
  color: var(--text);
  font-weight: var(--ft-font-semibold);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 640px) {
  .accounts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
