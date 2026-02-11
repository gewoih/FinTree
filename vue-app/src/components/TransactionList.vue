<script setup lang="ts">
import { computed, watch } from 'vue'
import Column from 'primevue/column'
import Skeleton from 'primevue/skeleton'
import { useRoute } from 'vue-router'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import { PAGINATION_OPTIONS } from '../constants'
import { useTransactionFilters } from '../composables/useTransactionFilters'
import { useViewport } from '../composables/useViewport'
import TransactionFilters from './TransactionFilters.vue'
import { formatCurrency, formatDate } from '../utils/formatters'
import type { Transaction, UpdateTransferPayload } from '../types'
import { TRANSACTION_TYPE } from '../types'

interface EnrichedTransaction extends Transaction {
  accountName?: string
  accountCurrency?: string
  accountSymbol?: string
  categoryName?: string
  categoryColor?: string
  dateKey: string
  dateLabel: string
  isDayStart?: boolean
  signedAmount: number
  signedBaseAmount: number
  displayAmount: number
  displayCurrency?: string
  originalAmount: number
  originalCurrency?: string
  showOriginal: boolean
  isTransferSummary?: boolean
  transferFromAccountId?: string
  transferToAccountId?: string
  transferFromAmount?: number
  transferToAmount?: number
  transferFromCurrency?: string
  transferToCurrency?: string
  transferFeeAmount?: number
  transferRate?: number
  transferRateLabel?: string
}

const emit = defineEmits<{
  (e: 'add-transaction'): void
  (e: 'edit-transaction', transaction: Transaction): void
  (e: 'edit-transfer', transfer: UpdateTransferPayload): void
}>()

const store = useFinanceStore()
const userStore = useUserStore()
const route = useRoute()
const { isMobile } = useViewport()

const baseCurrency = computed(() => userStore.baseCurrencyCode ?? store.primaryAccount?.currencyCode ?? 'RUB')

const transactionsLoading = computed(() => store.isTransactionsLoading)

const formatRate = (value: number): string =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(value)

const buildRateLabel = (
  rate: number,
  fromCurrency?: string,
  toCurrency?: string,
  feeAmount?: number
): string | null => {
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) {
    return null
  }

  const label = feeAmount && feeAmount > 0 ? 'Курс (с комиссией)' : 'Курс'
  return `${label}: 1 ${fromCurrency} = ${formatRate(rate)} ${toCurrency}`
}

const formatDateKey = (value?: string): string => {
  if (!value) return 'unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown'
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateLabel = (value?: string): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

const enrichedTransactions = computed<EnrichedTransaction[]>(() => {
  const transferGroups = new Map<string, Transaction[]>()
  const transferFees = new Map<string, number>()
  const regularTransactions: Transaction[] = []

  store.transactions.forEach((txn: Transaction) => {
    if (txn.transferId && !txn.isTransfer) {
      const feeAmount = Math.abs(Number(txn.amount ?? 0))
      if (feeAmount > 0) {
        const current = transferFees.get(txn.transferId) ?? 0
        transferFees.set(txn.transferId, current + feeAmount)
      }
    }

    if (txn.isTransfer && txn.transferId) {
      const key = txn.transferId
      const group = transferGroups.get(key) ?? []
      group.push(txn)
      transferGroups.set(key, group)
      return
    }
    regularTransactions.push(txn)
  })

  const transferSummaries: EnrichedTransaction[] = []
  transferGroups.forEach((group, transferId) => {
    const expense = group.find(item => item.type === TRANSACTION_TYPE.Expense)
    const income = group.find(item => item.type === TRANSACTION_TYPE.Income)
    if (!expense || !income) {
      return
    }

    const fromAccount = expense.account
    const toAccount = income.account
    const fromCurrency = expense.originalCurrencyCode ?? fromAccount?.currency?.code ?? fromAccount?.currencyCode
    const toCurrency = income.originalCurrencyCode ?? toAccount?.currency?.code ?? toAccount?.currencyCode
    const fromAmount = Number(expense.amount)
    const toAmount = Number(income.amount)
    const feeAmount = transferFees.get(transferId) ?? 0
    const effectiveFromAmount = fromAmount + feeAmount
    const transferRate =
      effectiveFromAmount > 0 &&
      toAmount > 0 &&
      fromCurrency &&
      toCurrency &&
      fromCurrency !== toCurrency
        ? toAmount / effectiveFromAmount
        : undefined
    const transferRateLabel = transferRate
      ? buildRateLabel(transferRate, fromCurrency, toCurrency, feeAmount) ?? undefined
      : undefined

    const dateKey = formatDateKey(expense.occurredAt)
    const dateLabel = formatDateLabel(expense.occurredAt)

    transferSummaries.push({
      ...expense,
      id: transferId,
      isTransferSummary: true,
      transferFromAccountId: expense.accountId,
      transferToAccountId: income.accountId,
      transferFromAmount: fromAmount,
      transferToAmount: toAmount,
      transferFromCurrency: fromCurrency,
      transferToCurrency: toCurrency,
      transferFeeAmount: feeAmount > 0 ? feeAmount : undefined,
      transferRate,
      transferRateLabel,
      accountName: `${fromAccount?.name ?? '—'} → ${toAccount?.name ?? '—'}`,
      accountCurrency: fromAccount?.currency?.code ?? fromAccount?.currencyCode,
      accountSymbol: fromAccount?.currency?.symbol ?? '',
      categoryName: 'Перевод',
      categoryColor: '#94a3b8',
      signedAmount: 0,
      signedBaseAmount: 0,
      displayAmount: 0,
      displayCurrency: baseCurrency.value,
      originalAmount: Number(expense.originalAmount ?? expense.amount),
      originalCurrency: fromCurrency,
      showOriginal: false,
      isMandatory: false,
      dateKey,
      dateLabel
    } as EnrichedTransaction)
  })

  const mappedRegular = regularTransactions.map((txn: Transaction) => {
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
    const showOriginal = !isIncome && originalCurrency != null && originalCurrency !== baseCurrency.value
    const dateKey = formatDateKey(txn.occurredAt)
    const dateLabel = formatDateLabel(txn.occurredAt)

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
      isMandatory: txn.isMandatory,
      dateKey,
      dateLabel
    } as EnrichedTransaction
  })

  return [...transferSummaries, ...mappedRegular]
})

const {
  searchText,
  selectedCategory,
  selectedAccount,
  dateRange,
  filteredTransactions,
  clearFilters: clearFiltersComposable
} = useTransactionFilters<EnrichedTransaction>(() => enrichedTransactions.value)

const sortedTransactions = computed(() => {
  const sorted = [...filteredTransactions.value].sort((a, b) => {
    const timeA = new Date(a.occurredAt).getTime()
    const timeB = new Date(b.occurredAt).getTime()
    return timeB - timeA
  })

  return sorted.map((item, index) => {
    const prev = sorted[index - 1]
    const isDayStart = !prev || prev.dateKey !== item.dateKey
    return {
      ...item,
      isDayStart
    }
  })
})

const rowClass = (data: EnrichedTransaction) => ({
  'transaction-row--day-start': data.isDayStart,
  'transaction-row--transfer': data.isTransferSummary
})

const totalAmount = computed(() =>
  filteredTransactions.value.reduce(
    (sum, txn) =>
      txn.isTransferSummary
        ? sum
        : sum + Number(txn.signedBaseAmount ?? txn.signedAmount ?? 0),
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

const paginatorTemplate = computed(() =>
  isMobile.value
    ? 'PrevPageLink PageLinks NextPageLink'
    : 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown'
)

const currentPageReportTemplate = computed(() =>
  isMobile.value ? '' : 'Показано {first} - {last} из {totalRecords}'
)

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
watch(selectedAccount, () => {
  store.fetchTransactions()
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

const handleRowClick = (event: { data: EnrichedTransaction }) => {
  if (event.data.isTransferSummary) {
    if (!event.data.transferFromAccountId || !event.data.transferToAccountId) {
      return
    }

    emit('edit-transfer', {
      transferId: event.data.id,
      fromAccountId: event.data.transferFromAccountId,
      toAccountId: event.data.transferToAccountId,
      fromAmount: event.data.transferFromAmount ?? 0,
      toAmount: event.data.transferToAmount ?? 0,
      feeAmount: event.data.transferFeeAmount ?? null,
      occurredAt: event.data.occurredAt,
      description: event.data.description ?? null
    })
    return
  }
  emit('edit-transaction', event.data)
}
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
      <UiDataTable
        class="transaction-history__datatable"
        :value="sortedTransactions"
        sort-field="occurredAt"
        :sort-order="-1"
        striped-rows
        row-hover
        :responsive-layout="isMobile ? 'stack' : 'scroll'"
        breakpoint="768px"
        :paginator="true"
        :rows="PAGINATION_OPTIONS.defaultRows"
        :rows-per-page-options="[...PAGINATION_OPTIONS.options]"
        :paginator-template="paginatorTemplate"
        :current-page-report-template="currentPageReportTemplate"
        :global-filter-fields="['categoryName', 'accountName', 'description']"
        :row-class="rowClass"
        selection-mode="single"
        data-key="id"
        @row-click="handleRowClick"
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
          style="width: 140px"
        >
          <template #body="slotProps">
            <div class="date-cell">
              <span class="date-cell__main">{{ formatDate(slotProps.data.occurredAt) }}</span>
            </div>
          </template>
        </Column>

        <Column
          field="displayAmount"
          header="Сумма"
          :sortable="true"
          style="width: 170px"
        >
          <template #body="slotProps">
            <div
              v-if="slotProps.data.isTransferSummary"
              class="transfer-amount"
            >
              <div class="transfer-amount__row negative">
                − {{ formatCurrency(slotProps.data.transferFromAmount ?? 0, slotProps.data.transferFromCurrency) }}
              </div>
              <div class="transfer-amount__row positive">
                + {{ formatCurrency(slotProps.data.transferToAmount ?? 0, slotProps.data.transferToCurrency) }}
              </div>
              <div
                v-if="slotProps.data.transferRateLabel"
                class="transfer-amount__rate"
              >
                {{ slotProps.data.transferRateLabel }}
              </div>
            </div>
            <div
              v-else
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
            </div>
          </template>
        </Column>

        <Column
          field="categoryName"
          header="Категория"
          :sortable="true"
          style="width: 200px"
        >
          <template #body="slotProps">
            <div class="category-cell">
              <UiBadge
                :label="slotProps.data.categoryName"
                :color="slotProps.data.categoryColor"
              />
              <i
                v-if="slotProps.data.isTransferSummary"
                class="pi pi-arrow-right-arrow-left transfer-icon"
                title="Перевод между счетами"
              />
              <i
                v-else-if="slotProps.data.isMandatory"
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
          style="width: 220px"
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
          style="width: 200px"
        >
          <template #body="slotProps">
            <div
              v-if="slotProps.data.isTransferSummary"
              class="description-transfer"
            >
              <span
                v-if="slotProps.data.description"
                class="description-text"
              >
                {{ slotProps.data.description }}
              </span>
              <span
                v-if="!slotProps.data.description"
                class="description-empty"
              >—</span>
            </div>
            <span
              v-else-if="slotProps.data.description"
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
  display: grid;
  gap: 2px;
}

.date-cell__main {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}


.amount-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
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
  font-variant-numeric: tabular-nums;
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

.transfer-amount {
  display: grid;
  gap: 2px;
  font-weight: var(--ft-font-semibold);
  font-variant-numeric: tabular-nums;
}

.transfer-amount__row {
  display: flex;
  align-items: center;
  gap: var(--ft-space-1);
  font-size: var(--ft-text-sm);
}

.transfer-amount__row.negative {
  color: var(--ft-danger-400);
}

.transfer-amount__row.positive {
  color: var(--ft-success-400);
}

.transfer-amount__rate {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
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
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.description-transfer {
  display: grid;
  gap: 2px;
}

.description-empty {
  color: var(--ft-text-tertiary);
}

.mandatory-icon {
  color: var(--ft-warning-400);
  font-size: var(--ft-text-sm);
}

.transfer-icon {
  color: var(--ft-primary-400);
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

:deep(.transaction-history__datatable .p-datatable .p-column-header-content) {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

:deep(.transaction-history__datatable .p-datatable-tbody > tr.transaction-row--day-start > td) {
  border-top: 2px solid color-mix(in srgb, var(--ft-primary-500, #3b82f6) 35%, transparent);
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
  background: color-mix(in srgb, var(--ft-surface-raised) 90%, transparent);
}

:deep(.transaction-history__datatable .p-datatable-tbody > tr) {
  cursor: pointer;
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

@media (max-width: 768px) {
  :deep(.transaction-history__datatable .p-datatable) {
    border: none;
    background: transparent;
  }

  :deep(.transaction-history__datatable .p-datatable-thead) {
    display: none;
  }

  :deep(.transaction-history__datatable .p-datatable-tbody > tr) {
    display: block;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-3);
    overflow: hidden;
  }

  :deep(.transaction-history__datatable .p-datatable-tbody > tr > td) {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border);
  }

  :deep(.transaction-history__datatable .p-datatable-tbody > tr > td:last-child) {
    border-bottom: none;
  }

  :deep(.transaction-history__datatable .p-datatable-tbody > tr > td .p-column-title) {
    font-size: var(--ft-text-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ft-text-tertiary);
    font-weight: var(--ft-font-semibold);
  }

  .description-text {
    white-space: normal;
  }
}
</style>
