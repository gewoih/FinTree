<script setup lang="ts">
import { computed, watch } from 'vue'
import Column from 'primevue/column'
import Skeleton from 'primevue/skeleton'
import { useRoute } from 'vue-router'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import { PAGINATION_OPTIONS } from '../constants'
import { useTransactionFilters } from '../composables/useTransactionFilters'
import TransactionFilters from './TransactionFilters.vue'
import { formatCurrency, formatDate } from '../utils/formatters'
import type { Transaction } from '../types'
import { TRANSACTION_TYPE } from '../types'

interface EnrichedTransaction extends Transaction {
  accountName?: string
  accountCurrency?: string
  accountSymbol?: string
  categoryName?: string
  categoryColor?: string
  signedAmount: number
  signedBaseAmount: number
  displayAmount: number
  displayCurrency?: string
  originalAmount: number
  originalCurrency?: string
  showOriginal: boolean
}

const emit = defineEmits<{
  (e: 'add-transaction'): void
  (e: 'edit-transaction', transaction: Transaction): void
}>()

const store = useFinanceStore()
const userStore = useUserStore()
const route = useRoute()

const baseCurrency = computed(() => userStore.baseCurrencyCode ?? store.primaryAccount?.currencyCode ?? 'RUB')

const transactionsLoading = computed(() => store.isTransactionsLoading)

const enrichedTransactions = computed<EnrichedTransaction[]>(() =>
  store.transactions.map((txn: Transaction) => {
    const account = txn.account
    const category = txn.category

    const accountCurrency = account?.currency?.code ?? account?.currencyCode
    const baseAmount = Number(txn.amountInBaseCurrency ?? txn.amount)
    const isIncome = txn.type === TRANSACTION_TYPE.Income
    const signedAmount = isIncome ? Math.abs(Number(txn.amount)) : -Math.abs(Number(txn.amount))
    const signedBaseAmount = isIncome ? Math.abs(baseAmount) : -Math.abs(baseAmount)
    const originalAmount = Number(txn.originalAmount ?? txn.amount)
    const originalCurrency = txn.originalCurrencyCode ?? accountCurrency
    const displayAmount = isIncome ? signedAmount : signedBaseAmount
    const displayCurrency = isIncome ? accountCurrency : baseCurrency.value
    const showOriginal = !isIncome && originalCurrency != null

    return {
      ...txn,
      accountName: account?.name,
      accountCurrency,
      accountSymbol: account?.currency?.symbol ?? '',
      categoryName: category?.name,
      categoryColor: category?.color,
      signedAmount,
      signedBaseAmount,
      displayAmount,
      displayCurrency,
      originalAmount,
      originalCurrency,
      showOriginal,
      isMandatory: txn.isMandatory
    } as EnrichedTransaction
  })
)

const {
  searchText,
  selectedCategory,
  selectedAccount,
  dateRange,
  filteredTransactions,
  clearFilters: clearFiltersComposable
} = useTransactionFilters<EnrichedTransaction>(() => enrichedTransactions.value)

const totalAmount = computed(() =>
  filteredTransactions.value.reduce(
    (sum, txn) => sum + Number(txn.signedBaseAmount ?? txn.signedAmount ?? 0),
    0
  )
)

const formattedTotalAmount = computed(() => {
  const total = totalAmount.value
  if (total === 0) {
    return formatCurrency(0, baseCurrency.value)
  }
  const sign = total < 0 ? '−' : '+'
  const formatted = formatCurrency(Math.abs(total), baseCurrency.value)
  return `${sign} ${formatted}`
})

const clearFilters = () => {
  clearFiltersComposable()
  store.fetchTransactions()
}

const parseDateQuery = (value: string): Date | null => {
  const trimmed = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2]) - 1
    const day = Number(match[3])
    return new Date(year, month, day)
  }
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const applyCategoryFromQuery = () => {
  const categoryId = typeof route.query.categoryId === 'string' ? route.query.categoryId : null
  if (!categoryId) return
  const match = store.categories.find(cat => cat.id === categoryId)
  if (match) {
    selectedCategory.value = match
  }
}

const applyDateRangeFromQuery = () => {
  const from = typeof route.query.from === 'string' ? parseDateQuery(route.query.from) : null
  const to = typeof route.query.to === 'string' ? parseDateQuery(route.query.to) : null
  if (from && to) {
    dateRange.value = [from, to]
  }
}

// При смене счета сразу подтягиваем свежие транзакции, чтобы таблица не показывала устаревшие данные.
watch(selectedAccount, account => {
  store.fetchTransactions(account?.id)
})

watch([() => route.query.categoryId, () => store.categories.length], applyCategoryFromQuery, {
  immediate: true
})

watch([() => route.query.from, () => route.query.to], applyDateRangeFromQuery, {
  immediate: true
})

const isEmptyState = computed(
  () => !transactionsLoading.value && filteredTransactions.value.length === 0
)
</script>

<template>
  <div class="transaction-history">
    <UiCard
      class="transaction-history__filters"
      variant="muted"
      padding="lg"
    >
      <TransactionFilters
        v-model:search-text="searchText"
        v-model:selected-category="selectedCategory"
        v-model:selected-account="selectedAccount"
        v-model:date-range="dateRange"
        :categories="store.categories"
        :accounts="store.accounts"
        @clear-filters="clearFilters"
      />
    </UiCard>

    <div
      v-if="transactionsLoading"
      class="table-skeleton"
    >
      <Skeleton
        v-for="i in 6"
        :key="i"
        height="54px"
      />
    </div>

    <EmptyState
      v-else-if="isEmptyState"
      icon="pi-database"
      title="Транзакции не найдены"
      description="Измените фильтры или добавьте первую транзакцию, чтобы увидеть активность."
      action-label="Добавить транзакцию"
      action-icon="pi pi-plus"
      @action="emit('add-transaction')"
    />

    <UiCard
      v-else
      class="transaction-history__table"
      padding="lg"
    >
      <template #header>
        <div class="table-shell__header">
          <div>
            <h3 class="table-shell__title">
              История транзакций
            </h3>
            <p class="table-shell__meta">
              {{ filteredTransactions.length }}
              {{ filteredTransactions.length === 1 ? 'транзакция' : filteredTransactions.length < 5 ? 'транзакции' : 'транзакций' }}
              по {{ store.accounts.length }}
              {{ store.accounts.length === 1 ? 'счету' : store.accounts.length < 5 ? 'счетам' : 'счетам' }}
            </p>
          </div>
          <div class="table-shell__actions">
            <UiButton
              variant="ghost"
              icon="pi pi-plus"
              label="Добавить"
              @click="emit('add-transaction')"
            />
          </div>
        </div>
      </template>
      <UiDataTable
        class="transaction-history__datatable"
        :value="filteredTransactions"
        sort-field="occurredAt"
        :sort-order="-1"
        striped-rows
        row-hover
        responsive-layout="scroll"
        :paginator="true"
        :rows="PAGINATION_OPTIONS.defaultRows"
        :rows-per-page-options="[...PAGINATION_OPTIONS.options]"
        paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        current-page-report-template="Показано {first} - {last} из {totalRecords}"
        :global-filter-fields="['categoryName', 'accountName', 'description']"
      >
        <template #footer>
          <div class="transaction-history__summary">
            <span>Итого</span>
            <span class="transaction-history__summary-amount">
              {{ formattedTotalAmount }}
            </span>
          </div>
        </template>

        <Column
          field="occurredAt"
          header="Дата"
          :sortable="true"
          style="min-width: 120px"
        >
          <template #body="slotProps">
            <span class="date-cell">{{ formatDate(slotProps.data.occurredAt) }}</span>
          </template>
        </Column>

        <Column
          field="displayAmount"
          header="Сумма"
          :sortable="true"
          style="min-width: 160px"
        >
          <template #body="slotProps">
            <div
              class="amount-cell"
              :class="{ negative: slotProps.data.displayAmount < 0 }"
            >
              <span class="amount-value">
                {{ slotProps.data.displayAmount < 0 ? '−' : '+' }}
                {{ formatCurrency(Math.abs(slotProps.data.displayAmount), slotProps.data.displayCurrency) }}
              </span>
              <small
                v-if="slotProps.data.showOriginal"
                class="amount-original"
              >
                {{ formatCurrency(Math.abs(slotProps.data.originalAmount), slotProps.data.originalCurrency) }}
              </small>
              <small
                v-else
                class="amount-currency"
              >
                {{ slotProps.data.accountSymbol || slotProps.data.displayCurrency }}
              </small>
            </div>
          </template>
        </Column>

        <Column
          field="categoryName"
          header="Категория"
          :sortable="true"
          style="min-width: 180px"
        >
          <template #body="slotProps">
            <div class="category-cell">
              <UiBadge
                :label="slotProps.data.categoryName"
                :color="slotProps.data.categoryColor"
              />
              <i
                v-if="slotProps.data.isMandatory"
                class="pi pi-lock mandatory-icon"
                title="Обязательный платеж"
              />
            </div>
          </template>
        </Column>

        <Column
          field="accountName"
          header="Счет"
          :sortable="true"
          style="min-width: 160px"
        >
          <template #body="slotProps">
            <div class="account-cell">
              <i
                class="pi pi-credit-card"
                aria-hidden="true"
              />
              <span>{{ slotProps.data.accountName }}</span>
            </div>
          </template>
        </Column>

        <Column
          field="description"
          header="Заметки"
          style="min-width: 220px"
        >
          <template #body="slotProps">
            <span
              v-if="slotProps.data.description"
              class="description-text"
            >
              {{ slotProps.data.description }}
            </span>
            <span
              v-else
              class="description-empty"
            >—</span>
          </template>
        </Column>

        <Column
          header="Действия"
          style="min-width: 120px"
        >
          <template #body="slotProps">
            <UiButton
              icon="pi pi-pencil"
              variant="ghost"
              aria-label="Редактировать транзакцию"
              @click="emit('edit-transaction', slotProps.data)"
            />
          </template>
        </Column>
      </UiDataTable>
    </UiCard>
  </div>
</template>

<style scoped>
.transaction-history {
  display: flex;
  flex-direction: column;
  gap: var(--ft-layout-card-gap);
}

.transaction-history__filters :deep(.transaction-filters) {
  gap: var(--ft-space-4);
}

.table-skeleton {
  display: grid;
  gap: var(--ft-space-2);
}

.transaction-history__table {
  gap: var(--space-4);
}

.transaction-history__datatable :deep(.ui-datatable__shell) {
  border: none;
  background: transparent;
  box-shadow: none;
}

.date-cell {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.amount-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--ft-space-1);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-success-400);
  line-height: 1.2;
}

.amount-cell.negative {
  color: var(--ft-danger-400);
}

.amount-value {
  font-size: var(--ft-text-base);
}

.amount-currency {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
  line-height: 1;
}

.amount-original {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
  line-height: 1.1;
}

.category-cell {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.account-cell {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  color: var(--ft-text-primary);
  font-weight: var(--ft-font-medium);
}

.account-cell i {
  color: var(--ft-text-tertiary);
}

.description-text {
  color: var(--ft-text-secondary);
}

.description-empty {
  color: var(--ft-text-tertiary);
}

.mandatory-icon {
  color: var(--ft-warning-400);
  font-size: var(--ft-text-sm);
}

:deep(.transaction-history__datatable .p-datatable) {
  border: none;
  border-radius: 0;
}

:deep(.transaction-history__datatable .p-datatable .p-datatable-thead > tr > th),
:deep(.transaction-history__datatable .p-datatable .p-datatable-tbody > tr > td) {
  border-right: none;
}

:deep(.transaction-history__datatable .p-datatable .p-datatable-thead > tr > th:last-child),
:deep(.transaction-history__datatable .p-datatable .p-datatable-tbody > tr > td:last-child) {
  text-align: center;
}

:deep(.transaction-history__datatable .p-datatable .p-column-header-content) {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: var(--ft-space-3);
  vertical-align: middle;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  font-size: var(--ft-text-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ft-text-tertiary);
}

:deep(.p-datatable .p-paginator-bottom) {
  border-top: 1px solid var(--ft-border-soft);
  padding: var(--ft-space-3);
}

:deep(.transaction-history__datatable .p-datatable-footer) {
  display: flex;
  justify-content: flex-end;
  padding: var(--ft-space-3);
  border-top: 1px solid var(--ft-border-soft);
  background: transparent;
}

.transaction-history__summary {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.transaction-history__summary-amount {
  font-size: var(--ft-text-base);
}

:deep(.p-datatable .p-paginator .p-dropdown) {
  min-width: 6.5rem;
}
</style>
