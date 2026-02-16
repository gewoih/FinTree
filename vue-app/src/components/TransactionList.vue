<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Skeleton from 'primevue/skeleton'
import Paginator from 'primevue/paginator'
import { useRoute } from 'vue-router'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import { PAGINATION_OPTIONS } from '../constants'
import { useTransactionFilters } from '../composables/useTransactionFilters'
import TransactionFilters from './TransactionFilters.vue'
import { formatCurrency } from '../utils/formatters'
import { formatUtcDateOnly, getUtcDateOnlyKey, toUtcDateOnlyIso } from '../utils/dateOnly'
import type { Transaction, TransactionsQuery, UpdateTransferPayload } from '../types'
import { TRANSACTION_TYPE } from '../types'
import UiCard from '../ui/UiCard.vue'
import EmptyState from './common/EmptyState.vue'

const FALLBACK_CATEGORY_COLOR = '#94a3b8'

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

interface TransactionGroup {
  dateKey: string
  dateLabel: string
  dayTotal: string
  transactions: EnrichedTransaction[]
}

const props = withDefaults(defineProps<{
  readonly?: boolean
}>(), {
  readonly: false
})

const emit = defineEmits<{
  (e: 'add-transaction'): void
  (e: 'edit-transaction', transaction: Transaction): void
  (e: 'edit-transfer', transfer: UpdateTransferPayload): void
}>()

const store = useFinanceStore()
const userStore = useUserStore()
const route = useRoute()

const baseCurrency = computed(() => userStore.baseCurrencyCode ?? store.primaryAccount?.currencyCode ?? 'RUB')

const transactionsLoading = computed(() => store.isTransactionsLoading)
const debouncedSearchText = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

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
  return getUtcDateOnlyKey(value)
}

const formatDateLabel = (value?: string): string => {
  return formatUtcDateOnly(value, 'ru-RU', {
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
      regularTransactions.push(...group)
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
      categoryColor: FALLBACK_CATEGORY_COLOR,
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
  clearFilters: clearFiltersComposable
} = useTransactionFilters<EnrichedTransaction>(() => enrichedTransactions.value)

const sortedTransactions = computed(() => {
  const sorted = [...enrichedTransactions.value].sort((a, b) => {
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

const groupedTransactions = computed<TransactionGroup[]>(() => {
  const groups: TransactionGroup[] = []
  let currentGroup: TransactionGroup | null = null

  for (const txn of sortedTransactions.value) {
    if (!currentGroup || currentGroup.dateKey !== txn.dateKey) {
      const dayTransactions = sortedTransactions.value.filter(t => t.dateKey === txn.dateKey)
      const daySum = dayTransactions.reduce(
        (sum, t) => t.isTransferSummary ? sum : sum + Number(t.signedBaseAmount ?? t.signedAmount ?? 0),
        0
      )
      const sign = daySum < 0 ? '−' : '+'
      const dayTotal = daySum === 0
        ? formatCurrency(0, baseCurrency.value)
        : `${sign}${formatCurrency(Math.abs(daySum), baseCurrency.value)}`

      currentGroup = {
        dateKey: txn.dateKey,
        dateLabel: txn.dateLabel,
        dayTotal,
        transactions: []
      }
      groups.push(currentGroup)
    }
    currentGroup.transactions.push(txn)
  }

  return groups
})

const totalAmount = computed(() =>
  sortedTransactions.value.reduce(
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

const clearFilters = () => {
  clearFiltersComposable()
}

const normalizeDateOnly = (value: Date): string | null => {
  const key = getUtcDateOnlyKey(toUtcDateOnlyIso(value))
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null
}

const buildTransactionsQuery = (overrides: Partial<TransactionsQuery> = {}): TransactionsQuery => {
  const hasValidRange =
    dateRange.value != null &&
    dateRange.value.length === 2 &&
    dateRange.value[0] instanceof Date &&
    dateRange.value[1] instanceof Date

  const fromDate = hasValidRange ? dateRange.value?.[0] : null
  const toDate = hasValidRange ? dateRange.value?.[1] : null
  const from = fromDate instanceof Date ? normalizeDateOnly(fromDate) : null
  const to = toDate instanceof Date ? normalizeDateOnly(toDate) : null

  return {
    accountId: selectedAccount.value?.id ?? null,
    categoryId: selectedCategory.value?.id ?? null,
    from,
    to,
    search: debouncedSearchText.value.trim() ? debouncedSearchText.value.trim() : null,
    page: 1,
    size: store.transactionsPageSize || PAGINATION_OPTIONS.defaultRows,
    ...overrides
  }
}

const fetchFilteredTransactions = (overrides: Partial<TransactionsQuery> = {}) => {
  const query = buildTransactionsQuery(overrides)
  store.fetchTransactions(query)
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

watch([() => route.query.categoryId, () => store.categories.length], applyCategoryFromQuery, {
  immediate: true
})

watch([() => route.query.from, () => route.query.to], applyDateRangeFromQuery, {
  immediate: true
})

watch(
  () => searchText.value,
  value => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    searchDebounceTimer = setTimeout(() => {
      debouncedSearchText.value = value.trim()
    }, 300)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})

const canLoadTransactions = computed(() => {
  // Wait for categories to load before fetching transactions
  // This prevents race conditions where transactions load before category data is available
  return !store.areCategoriesLoading && store.categories.length > 0
})

watch(
  [
    () => selectedAccount.value?.id ?? null,
    () => selectedCategory.value?.id ?? null,
    () => dateRange.value?.[0]?.getTime?.() ?? null,
    () => dateRange.value?.[1]?.getTime?.() ?? null,
    () => debouncedSearchText.value,
    () => canLoadTransactions.value
  ],
  () => {
    if (!canLoadTransactions.value) return
    fetchFilteredTransactions({ page: 1 })
  },
  { immediate: true }
)

const isEmptyState = computed(
  () => !transactionsLoading.value && sortedTransactions.value.length === 0
)

const paginationRows = computed(() => store.transactionsPageSize || PAGINATION_OPTIONS.defaultRows)
const paginationFirst = computed(() => Math.max(0, (store.transactionsPage - 1) * paginationRows.value))
const totalRecords = computed(() => store.transactionsTotal)

const handlePage = (event: { page: number; rows: number }) => {
  fetchFilteredTransactions({
    page: event.page + 1,
    size: event.rows
  })
}

const handleRowClick = (txn: EnrichedTransaction) => {
  if (props.readonly) return
  if (txn.isTransferSummary) {
    if (!txn.transferFromAccountId || !txn.transferToAccountId) {
      return
    }

    emit('edit-transfer', {
      transferId: txn.id,
      fromAccountId: txn.transferFromAccountId,
      toAccountId: txn.transferToAccountId,
      fromAmount: txn.transferFromAmount ?? 0,
      toAmount: txn.transferToAmount ?? 0,
      feeAmount: txn.transferFeeAmount ?? null,
      occurredAt: txn.occurredAt,
      description: txn.description ?? null
    })
    return
  }
  emit('edit-transaction', txn)
}
</script>

<template>
  <div
    class="txn-list"
    :class="{ 'txn-list--readonly': props.readonly }"
  >
    <UiCard
      class="txn-list__filters"
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
      class="txn-list__skeleton"
    >
      <Skeleton
        v-for="i in 6"
        :key="i"
        height="64px"
      />
    </div>

    <EmptyState
      v-else-if="isEmptyState"
      icon="pi-database"
      title="Транзакции не найдены"
      description="Измените фильтры или добавьте первую транзакцию, чтобы увидеть активность."
      :action-label="props.readonly ? '' : 'Добавить транзакцию'"
      action-icon="pi pi-plus"
      @action="emit('add-transaction')"
    />

    <template v-else>
      <div class="txn-groups">
        <section
          v-for="group in groupedTransactions"
          :key="group.dateKey"
          class="txn-group"
        >
          <header class="txn-group__header">
            <span class="txn-group__date">{{ group.dateLabel }}</span>
            <span class="txn-group__total">{{ group.dayTotal }}</span>
          </header>

          <div class="txn-group__rows">
            <button
              v-for="txn in group.transactions"
              :key="txn.id"
              type="button"
              class="txn-row"
              :class="{ 'txn-row--transfer': txn.isTransferSummary }"
              :disabled="props.readonly"
              @click="handleRowClick(txn)"
            >
              <div class="txn-row__left">
                <span
                  v-if="txn.isTransferSummary"
                  class="txn-row__icon txn-row__icon--transfer"
                >
                  <i class="pi pi-arrow-right-arrow-left" />
                </span>
                <span
                  v-else
                  class="txn-row__icon"
                  :style="{
                    backgroundColor: (txn.categoryColor ?? FALLBACK_CATEGORY_COLOR) + '26',
                    color: txn.categoryColor ?? FALLBACK_CATEGORY_COLOR
                  }"
                >
                  <span class="txn-row__dot" :style="{ backgroundColor: txn.categoryColor ?? FALLBACK_CATEGORY_COLOR }" />
                </span>

                <div class="txn-row__info">
                  <span class="txn-row__category">
                    {{ txn.categoryName ?? '—' }}
                    <i
                      v-if="txn.isMandatory && !txn.isTransferSummary"
                      class="pi pi-lock txn-row__mandatory"
                      title="Обязательный платеж"
                    />
                  </span>
                  <span class="txn-row__meta">
                    <template v-if="txn.accountName">{{ txn.accountName }}</template>
                    <template v-if="txn.accountName && txn.description"> · </template>
                    <template v-if="txn.description">{{ txn.description }}</template>
                  </span>
                </div>
              </div>

              <div class="txn-row__right">
                <template v-if="txn.isTransferSummary">
                  <span class="txn-row__amount txn-row__amount--negative">
                    −{{ formatCurrency(txn.transferFromAmount ?? 0, txn.transferFromCurrency) }}
                  </span>
                  <span class="txn-row__amount txn-row__amount--positive">
                    +{{ formatCurrency(txn.transferToAmount ?? 0, txn.transferToCurrency) }}
                  </span>
                  <span
                    v-if="txn.transferRateLabel"
                    class="txn-row__rate"
                  >
                    {{ txn.transferRateLabel }}
                  </span>
                </template>
                <template v-else>
                  <span
                    class="txn-row__amount"
                    :class="{
                      'txn-row__amount--negative': txn.displayAmount < 0,
                      'txn-row__amount--positive': txn.displayAmount > 0
                    }"
                  >
                    {{ txn.displayAmount < 0 ? '−' : '+' }}{{ formatCurrency(Math.abs(txn.displayAmount), txn.displayCurrency) }}
                  </span>
                  <span
                    v-if="txn.showOriginal"
                    class="txn-row__original"
                  >
                    {{ formatCurrency(Math.abs(txn.originalAmount), txn.originalCurrency) }}
                  </span>
                </template>
              </div>
            </button>
          </div>
        </section>
      </div>

      <div class="txn-list__footer">
        <span class="txn-list__total">
          Итого: <strong>{{ formattedTotalAmount }}</strong>
        </span>
        <Paginator
          :rows="paginationRows"
          :first="paginationFirst"
          :total-records="totalRecords"
          :rows-per-page-options="[...PAGINATION_OPTIONS.options]"
          @page="handlePage"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.txn-list {
  display: flex;
  flex-direction: column;
  gap: var(--ft-layout-card-gap);
}

.txn-list__skeleton {
  display: grid;
  gap: var(--ft-space-2);
}

/* --- Groups --- */
.txn-groups {
  display: flex;
  flex-direction: column;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}

.txn-group__header {
  position: sticky;
  z-index: var(--ft-z-raised);
  top: 0;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: var(--ft-space-2) var(--ft-space-4);

  font-size: var(--ft-text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;

  background: var(--ft-surface-base, var(--ft-bg));
  border-bottom: 1px solid var(--ft-border-soft);
}

.txn-group__date {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-tertiary);
}

.txn-group__total {
  font-weight: var(--ft-font-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-secondary);
}

/* --- Transaction rows --- */
.txn-group__rows {
  display: flex;
  flex-direction: column;
}

.txn-row {
  cursor: pointer;

  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;

  width: 100%;
  min-height: 76px;
  padding: var(--ft-space-4) var(--ft-space-5);

  font: inherit;
  color: inherit;
  text-align: left;

  background: none;
  border: none;
  border-bottom: 1px solid var(--ft-border-soft);

  transition: background-color var(--ft-transition-fast);
}

.txn-row:hover:not(:disabled) {
  background: var(--ft-surface-muted);
}

.txn-row:disabled {
  cursor: default;
}

.txn-row:last-child {
  border-bottom: none;
}

.txn-row__left {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  min-width: 0;
}

.txn-row__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  width: 44px;
  height: 44px;

  border-radius: var(--ft-radius-md);
}

.txn-row__icon--transfer {
  color: var(--ft-primary-400);
  background: color-mix(in srgb, var(--ft-primary-400) 15%, transparent);
}

.txn-row__dot {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.txn-row__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.txn-row__category {
  display: flex;
  gap: var(--ft-space-1);
  align-items: center;

  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.txn-row__mandatory {
  font-size: 0.7rem;
  color: var(--ft-warning-400);
}

.txn-row__meta {
  overflow: hidden;

  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.txn-row__right {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 2px;
  align-items: flex-end;
}

.txn-row__amount {
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
  color: var(--ft-text-primary);
}

.txn-row__amount--negative {
  color: var(--ft-danger-400);
}

.txn-row__amount--positive {
  color: var(--ft-success-400);
}

.txn-row__original {
  font-size: var(--ft-text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-tertiary);
}

.txn-row__rate {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

/* --- Footer --- */
.txn-list__footer {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
  align-items: center;
}

.txn-list__total {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.txn-list__total strong {
  font-weight: 700;
  color: var(--ft-text-primary);
}

/* --- Paginator overrides --- */
.txn-list__footer :deep(.p-paginator) {
  padding: var(--ft-space-2);
  background: transparent;
  border: none;
}

@media (width <= 640px) {
  .txn-row {
    min-height: 56px;
    padding: var(--ft-space-2) var(--ft-space-3);
  }

  .txn-group__header {
    padding: var(--ft-space-2) var(--ft-space-3);
  }

  .txn-row__meta {
    max-width: 160px;
  }
}
</style>
