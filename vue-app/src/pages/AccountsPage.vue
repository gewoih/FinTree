<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import AccountFormModal from '../components/AccountFormModal.vue'
import AccountCard from '../components/AccountCard.vue'
import AccountBalanceAdjustmentsModal from '../components/AccountBalanceAdjustmentsModal.vue'
import type { Account } from '../types'

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

const sortOptions: Array<{ label: string; value: AccountsSort }> = [
  { label: 'По балансу (убыв.)', value: 'balance-desc' },
  { label: 'По балансу (возр.)', value: 'balance-asc' },
  { label: 'По названию', value: 'name-asc' },
]

const activeBankAccounts = computed(() =>
  (financeStore.accounts ?? []).filter(account => account.type === 0)
)

const archivedBankAccounts = computed(() =>
  (financeStore.archivedAccounts ?? []).filter(account => account.type === 0)
)

const visibleAccounts = computed(() =>
  view.value === 'active' ? activeBankAccounts.value : archivedBankAccounts.value
)

const loadingCurrentList = computed(() =>
  view.value === 'active'
    ? financeStore.areAccountsLoading
    : financeStore.areArchivedAccountsLoading
)

const filteredAccounts = computed(() => {
  let result = [...visibleAccounts.value]

  if (searchText.value.trim()) {
    const query = searchText.value.toLowerCase().trim()
    result = result.filter(account =>
      account.name.toLowerCase().includes(query) ||
      account.currencyCode.toLowerCase().includes(query) ||
      account.currency?.name.toLowerCase().includes(query)
    )
  }

  if (sortBy.value === 'name-asc') {
    result.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    return result
  }

  if (sortBy.value === 'balance-asc') {
    result.sort((a, b) => (a.balanceInBaseCurrency ?? 0) - (b.balanceInBaseCurrency ?? 0))
    return result
  }

  result.sort((a, b) => (b.balanceInBaseCurrency ?? 0) - (a.balanceInBaseCurrency ?? 0))
  return result
})

const hasActiveFilters = computed(() => searchText.value.trim().length > 0)

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

onMounted(async () => {
  await userStore.fetchCurrentUser()
  await Promise.all([
    financeStore.fetchCurrencies(),
    financeStore.fetchAccounts(),
    financeStore.fetchArchivedAccounts(),
  ])
})
</script>

<template>
  <PageContainer class="accounts">
    <PageHeader
      title="Счета"
      subtitle="Управляйте банковскими счетами в одном месте"
      :breadcrumbs="[
        { label: 'Главная', to: '/analytics' },
        { label: 'Счета' }
      ]"
    >
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

        <div class="accounts-controls">
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

          <UiSelect
            v-model="sortBy"
            class="accounts-sort"
            :options="sortOptions"
            option-label="label"
            option-value="value"
            placeholder="Сортировка"
            aria-label="Сортировка счетов"
          />

          <UiButton
            variant="ghost"
            :disabled="!hasActiveFilters"
            @click="clearFilters"
          >
            Сбросить
          </UiButton>
        </div>

        <p
          v-if="view === 'active'"
          class="accounts-toolbar__hint"
        >
          {{ isReadOnlyMode ? 'В режиме просмотра изменение счетов недоступно.' : 'Корректировка баланса доступна по кнопке внутри карточки счета.' }}
        </p>
      </UiCard>

      <div
        v-if="loadingCurrentList && visibleAccounts.length === 0"
        class="accounts__skeleton"
      >
        <UiSkeleton
          v-for="i in 4"
          :key="i"
          height="220px"
          class="account-skeleton"
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
        v-if="filteredAccounts.length > 0 && hasActiveFilters"
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

<style scoped>
.accounts {
  gap: var(--space-6);
}

.accounts__content {
  gap: var(--space-4);
}

.accounts-toolbar {
  gap: var(--space-3);
}

.accounts-toolbar__hint {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--text-muted);
}

.accounts-tabs {
  display: inline-flex;
  gap: var(--space-2);

  padding: var(--space-1);

  background: var(--surface-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.accounts-tab {
  cursor: pointer;

  display: inline-flex;
  gap: var(--space-2);
  align-items: center;

  min-height: 44px;
  padding: var(--space-2) var(--space-3);

  font-weight: var(--ft-font-medium);
  color: var(--text-muted);

  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
}

.accounts-tab strong {
  font-size: var(--ft-text-sm);
}

.accounts-tab.is-active {
  color: var(--text);
  background: color-mix(in srgb, var(--primary) 18%, transparent);
}

.accounts-tab:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}

.accounts-controls {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(220px, 280px) auto;
  gap: var(--space-3);
  align-items: center;
}

.accounts-search {
  display: flex;
  gap: var(--space-2);
  align-items: center;

  min-height: 44px;
  padding: 0 var(--space-3);

  background: var(--surface-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.accounts-search i {
  color: var(--text-muted);
}

.accounts-search :deep(.p-inputtext) {
  width: 100%;
  padding: 0;

  background: transparent;
  border: none;
  box-shadow: none;
}

.accounts-sort {
  min-height: 44px;
}

.accounts__skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.accounts-grid--few {
  grid-template-columns: repeat(auto-fit, minmax(300px, 380px));
  justify-content: start;
}

.accounts__results {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
}

.results-text {
  display: flex;
  gap: var(--space-2);
  align-items: center;

  margin: 0;

  font-size: var(--ft-text-sm);
  color: var(--text-muted);
}

.results-text strong {
  font-weight: var(--ft-font-semibold);
  color: var(--text);
}

@media (width <= 960px) {
  .accounts-controls {
    grid-template-columns: 1fr;
  }
}

@media (width <= 640px) {
  .accounts-tabs {
    justify-content: space-between;
    width: 100%;
  }

  .accounts-tab {
    flex: 1;
    justify-content: center;
  }

  .accounts-grid {
    grid-template-columns: 1fr;
  }

  .accounts__skeleton {
    grid-template-columns: 1fr;
  }
}
</style>
