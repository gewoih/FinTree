<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import AccountFormModal from '../components/AccountFormModal.vue'
import AccountCard from '../components/AccountCard.vue'
import AccountBalanceAdjustmentsModal from '../components/AccountBalanceAdjustmentsModal.vue'
import type { Account } from '../types'
import UiButton from '../ui/UiButton.vue'
import UiCard from '../ui/UiCard.vue'
import UiInputText from '../ui/UiInputText.vue'
import UiSkeleton from '../ui/UiSkeleton.vue'
import UiSection from '../ui/UiSection.vue'
import UiMessage from '../ui/UiMessage.vue'
import EmptyState from '../components/common/EmptyState.vue'
import PageContainer from '../components/layout/PageContainer.vue'
import PageHeader from '../components/common/PageHeader.vue'

type AccountsView = 'active' | 'archived'
type AccountsSort = 'balance-desc' | 'balance-asc' | 'name-asc'

const financeStore = useFinanceStore()
const userStore = useUserStore()
const toast = useToast()
const confirm = useConfirm()

const modalVisible = ref(false)
const editingAccount = ref<Account | null>(null)
const pendingPrimaryId = ref<string | null>(null)
const pendingLiquidityId = ref<string | null>(null)
const pendingArchiveId = ref<string | null>(null)
const pendingUnarchiveId = ref<string | null>(null)
const adjustmentsVisible = ref(false)
const selectedAccount = ref<Account | null>(null)

const view = ref<AccountsView>('active')
const searchText = ref('')
const sortBy = ref<AccountsSort>('balance-desc')
const isReadOnlyMode = computed(() => userStore.isReadOnlyMode)



const activeBankAccounts = computed(() =>
  (financeStore.accounts ?? []).filter(account => account.type === 0)
)

const archivedBankAccounts = computed(() =>
  (financeStore.archivedAccounts ?? []).filter(account => account.type === 0)
)

const visibleAccounts = computed(() =>
  view.value === 'active' ? activeBankAccounts.value : archivedBankAccounts.value
)

const currentAccountsState = computed(() =>
  view.value === 'active'
    ? financeStore.accountsState
    : financeStore.archivedAccountsState
)
const currentAccountsError = computed(() =>
  view.value === 'active'
    ? financeStore.accountsError
    : financeStore.archivedAccountsError
)
const hasVisibleAccounts = computed(() => visibleAccounts.value.length > 0)
const shouldShowAccountsSkeleton = computed(
  () =>
    (currentAccountsState.value === 'idle' || currentAccountsState.value === 'loading') &&
    !hasVisibleAccounts.value
)
const shouldShowAccountsErrorState = computed(
  () => currentAccountsState.value === 'error' && !hasVisibleAccounts.value
)

const filteredAccounts = computed(() => {
  let result = [...visibleAccounts.value]

  // 1. Apply search text filter
  if (searchText.value.trim()) {
    const query = searchText.value.toLowerCase().trim()
    result = result.filter(account =>
      account.name.toLowerCase().includes(query) ||
      account.currencyCode.toLowerCase().includes(query) ||
      account.currency?.name.toLowerCase().includes(query)
    )
  }

  const primaryAccount = financeStore.primaryAccount; // Type: Account | null
  let accountsToProcess = [...result]; // Create a mutable copy for manipulation
  let isPrimaryAccountPresent = false;

  if (primaryAccount) {
    const primaryAccountInFilteredIndex = accountsToProcess.findIndex(account => account.id === primaryAccount.id);
    if (primaryAccountInFilteredIndex !== -1) {
      isPrimaryAccountPresent = true;
      // Remove primary from the list to sort
      accountsToProcess = accountsToProcess.toSpliced(primaryAccountInFilteredIndex, 1);
    }
  }

  // 2. Apply sorting to the rest of the accounts (accountsToProcess)
  if (sortBy.value === 'name-asc') {
    accountsToProcess.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  } else if (sortBy.value === 'balance-asc') {
    accountsToProcess.sort((a, b) => (a.balanceInBaseCurrency ?? 0) - (b.balanceInBaseCurrency ?? 0))
  } else {
    // Default or 'balance-desc'
    accountsToProcess.sort((a, b) => (b.balanceInBaseCurrency ?? 0) - (a.balanceInBaseCurrency ?? 0))
  }

  // 3. Prepend the primary account if it exists and was originally in the filtered list
  if (primaryAccount && isPrimaryAccountPresent) {
    // primaryAccount is definitely Account here due to the 'if (primaryAccount)' check
    return [primaryAccount, ...accountsToProcess];
  }

  return accountsToProcess
})

const hasActiveFilters = computed(() => searchText.value.trim().length > 0)
const showAccountFilters = computed(() => visibleAccounts.value.length >= 5)

const openModal = () => {
  if (isReadOnlyMode.value) return
  editingAccount.value = null
  modalVisible.value = true
}

const openAdjustments = (account: Account) => {
  if (view.value === 'archived' || isReadOnlyMode.value) return
  selectedAccount.value = account
  adjustmentsVisible.value = true
}

const handleSetPrimary = async (accountId: string) => {
  if (isReadOnlyMode.value) return
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
  if (isReadOnlyMode.value) return
  editingAccount.value = account
  modalVisible.value = true
}

const handleLiquidityToggle = async (account: Account, value: boolean) => {
  if (isReadOnlyMode.value) return
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

const handleArchiveAccount = (account: Account) => {
  if (isReadOnlyMode.value) return
  if (pendingArchiveId.value) return

  confirm.require({
    message: `Архивировать счет "${account.name}"? Счет будет скрыт из активных операций, но история сохранится.`,
    header: 'Архивация счета',
    icon: 'pi pi-inbox',
    rejectLabel: 'Отмена',
    acceptLabel: 'Архивировать',
    accept: async () => {
      pendingArchiveId.value = account.id
      try {
        const success = await financeStore.archiveAccount(account.id)
        toast.add({
          severity: success ? 'success' : 'error',
          summary: success ? 'Счет архивирован' : 'Ошибка архивации',
          detail: success
            ? 'Счет перемещен в архив и недоступен для новых операций.'
            : 'Не удалось архивировать счет. Попробуйте позже.',
          life: 3000
        })
      } finally {
        pendingArchiveId.value = null
      }
    }
  })
}

const handleUnarchiveAccount = async (account: Account) => {
  if (isReadOnlyMode.value) return
  if (pendingUnarchiveId.value) return
  pendingUnarchiveId.value = account.id
  try {
    const success = await financeStore.unarchiveAccount(account.id)
    toast.add({
      severity: success ? 'success' : 'error',
      summary: success ? 'Счет разархивирован' : 'Ошибка',
      detail: success
        ? 'Счет снова доступен в активном списке.'
        : 'Не удалось разархивировать счет.',
      life: 3000
    })
  } finally {
    pendingUnarchiveId.value = null
  }
}

const clearFilters = () => {
  searchText.value = ''
}

const retryCurrentView = async () => {
  if (view.value === 'active') {
    await financeStore.fetchAccounts(true)
    return
  }

  await financeStore.fetchArchivedAccounts(true)
}

watch(showAccountFilters, isVisible => {
  if (!isVisible) {
    clearFilters()
  }
}, { immediate: true })

onMounted(async () => {
  // User is already loaded by AppShell on mount
  await Promise.all([
    financeStore.fetchCurrencies(),
    financeStore.fetchAccounts(),
    financeStore.fetchArchivedAccounts(),
  ])
})
</script>

<template>
  <PageContainer class="accounts">
    <PageHeader title="Счета">
      <template #actions>
        <UiButton
          label="Добавить счет"
          icon="pi pi-plus"
          :disabled="isReadOnlyMode"
          @click="openModal"
        />
      </template>
    </PageHeader>

    <UiSection class="accounts__content">
      <UiCard
        class="accounts-toolbar"
        variant="muted"
        padding="md"
      >
        <div
          class="accounts-tabs"
          role="tablist"
          aria-label="Фильтр счетов по статусу"
        >
          <button
            class="accounts-tab"
            :class="{ 'is-active': view === 'active' }"
            type="button"
            role="tab"
            :aria-selected="view === 'active'"
            @click="view = 'active'"
          >
            <span>Активные</span>
            <strong>{{ activeBankAccounts.length }}</strong>
          </button>
          <button
            class="accounts-tab"
            :class="{ 'is-active': view === 'archived' }"
            type="button"
            role="tab"
            :aria-selected="view === 'archived'"
            @click="view = 'archived'"
          >
            <span>Архив</span>
            <strong>{{ archivedBankAccounts.length }}</strong>
          </button>
        </div>

        <div
          v-if="showAccountFilters"
          class="accounts-controls"
        >
          <div class="accounts-search">
            <i
              class="pi pi-search"
              aria-hidden="true"
            />
            <UiInputText
              v-model="searchText"
              placeholder="Поиск по названию или валюте..."
              autocomplete="off"
              aria-label="Поиск счета"
            />
          </div>
        </div>
      </UiCard>

      <div
        v-if="currentAccountsState === 'error' && hasVisibleAccounts"
        class="accounts__error accounts__error--inline"
      >
        <UiMessage severity="error">
          {{ currentAccountsError || 'Не удалось загрузить список счетов.' }}
        </UiMessage>
        <UiButton
          label="Повторить"
          icon="pi pi-refresh"
          variant="secondary"
          @click="retryCurrentView"
        />
      </div>

      <div
        v-if="shouldShowAccountsSkeleton"
        class="accounts__skeleton"
      >
        <UiSkeleton
          v-for="i in 4"
          :key="i"
          height="220px"
          class="account-skeleton"
        />
      </div>

      <div
        v-else-if="shouldShowAccountsErrorState"
        class="accounts__error"
      >
        <UiMessage severity="error">
          {{ currentAccountsError || 'Не удалось загрузить список счетов.' }}
        </UiMessage>
        <UiButton
          label="Повторить"
          icon="pi pi-refresh"
          variant="secondary"
          @click="retryCurrentView"
        />
      </div>

      <EmptyState
        v-else-if="view === 'active' && activeBankAccounts.length === 0"
        icon="pi-wallet"
        title="Нет активных счетов"
        description="Добавьте банковский счет, чтобы начать отслеживать баланс и операции."
        :action-label="isReadOnlyMode ? '' : 'Добавить счет'"
        action-icon="pi pi-plus"
        @action="openModal"
      />

      <EmptyState
        v-else-if="view === 'archived' && archivedBankAccounts.length === 0"
        icon="pi-inbox"
        title="Архив пуст"
        description="Здесь будут отображаться архивированные счета."
        action-label="К активным счетам"
        action-icon="pi pi-arrow-left"
        @action="view = 'active'"
      />

      <EmptyState
        v-else-if="filteredAccounts.length === 0 && hasActiveFilters"
        icon="pi-filter-slash"
        title="Ничего не найдено"
        description="По вашему запросу не найдено ни одного счета. Попробуйте изменить поиск."
        action-label="Сбросить фильтры"
        action-icon="pi pi-refresh"
        @action="clearFilters"
      />

      <div
        v-else
        class="accounts-grid"
        :class="{ 'accounts-grid--few': filteredAccounts.length < 3 }"
      >
        <AccountCard
          v-for="account in filteredAccounts"
          :key="account.id"
          :account="account"
          :readonly="view === 'archived'"
          :interaction-locked="isReadOnlyMode"
          :is-primary-loading="pendingPrimaryId === account.id"
          :is-liquidity-loading="pendingLiquidityId === account.id"
          :is-archive-loading="pendingArchiveId === account.id || pendingUnarchiveId === account.id"
          @set-primary="handleSetPrimary(account.id)"
          @edit="handleEditAccount(account)"
          @archive="handleArchiveAccount(account)"
          @unarchive="handleUnarchiveAccount(account)"
          @open="openAdjustments(account)"
          @update-liquidity="handleLiquidityToggle(account, $event)"
        />
      </div>

      <div
        v-if="showAccountFilters && filteredAccounts.length > 0 && hasActiveFilters"
        class="surface-panel accounts__results"
      >
        <p class="results-text">
          <i
            class="pi pi-info-circle"
            aria-hidden="true"
          />
          Показано счетов: <strong>{{ filteredAccounts.length }}</strong> из <strong>{{ visibleAccounts.length }}</strong>
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
      :readonly="isReadOnlyMode"
    />
  </PageContainer>
</template>

<style scoped src="../styles/pages/accounts-page.css"></style>
