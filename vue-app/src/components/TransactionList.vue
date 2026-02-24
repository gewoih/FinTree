<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Skeleton from 'primevue/skeleton';
import Paginator from 'primevue/paginator'
import { useRoute, useRouter } from 'vue-router'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import { PAGINATION_OPTIONS } from '../constants'
import { useTransactionFilters } from '../composables/useTransactionFilters'
import {
  FALLBACK_CATEGORY_COLOR,
  type EnrichedTransaction,
  useTransactionListModel
} from '../composables/useTransactionListModel'
import TransactionFilters from './TransactionFilters.vue'
import { formatCurrency } from '../utils/formatters'
import { getUtcDateOnlyKey, toUtcDateOnlyIso } from '../utils/dateOnly'
import type { Transaction, TransactionsQuery, UpdateTransferPayload } from '../types'
import UiCard from '../ui/UiCard.vue'
import UiButton from '../ui/UiButton.vue'
import Message from 'primevue/message';
import EmptyState from './common/EmptyState.vue'

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
const router = useRouter()

const baseCurrency = computed(() => userStore.baseCurrencyCode ?? store.primaryAccount?.currencyCode ?? 'RUB')

const transactionsLoading = computed(() => store.isTransactionsLoading)
const transactionsState = computed(() => store.transactionsState)
const transactionsError = computed(() => store.transactionsError)
const debouncedSearchText = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null

const {
  enrichedTransactions,
  sortedTransactions,
  groupedTransactions,
  formattedTotalAmount
} = useTransactionListModel(store, baseCurrency)

const {
  searchText,
  selectedCategory,
  selectedAccount,
  dateRange,
  resetDateRange,
  clearFilters: clearFiltersComposable
} = useTransactionFilters<EnrichedTransaction>(() => enrichedTransactions.value)

const clearFilters = () => {
  clearFiltersComposable()
  resetDateRange()
  const nextQuery = { ...route.query }
  delete nextQuery.categoryId
  delete nextQuery.from
  delete nextQuery.to
  void router.replace({ query: nextQuery })
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
  if (!categoryId) {
    selectedCategory.value = null
    return
  }

  const match = store.categories.find(cat => cat.id === categoryId)
  selectedCategory.value = match ?? null
}

const applyDateRangeFromQuery = () => {
  const from = typeof route.query.from === 'string' ? parseDateQuery(route.query.from) : null
  const to = typeof route.query.to === 'string' ? parseDateQuery(route.query.to) : null
  if (from && to) {
    dateRange.value = from <= to ? [from, to] : [to, from]
    return
  }

  resetDateRange()
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
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer)
  }
})

const canLoadTransactions = computed(() => {
  // Wait for per-user categories readiness before fetching transactions.
  return store.areCategoriesReady
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

    // Debounce filter changes to avoid redundant API calls
    if (filterDebounceTimer) {
      clearTimeout(filterDebounceTimer)
    }

    filterDebounceTimer = setTimeout(() => {
      fetchFilteredTransactions({ page: 1 })
    }, 150)
  },
  { immediate: true }
)

const isEmptyState = computed(
  () => !transactionsLoading.value && sortedTransactions.value.length === 0
)
const hasTransactionsInView = computed(() => sortedTransactions.value.length > 0)
const shouldShowTransactionsSkeleton = computed(
  () =>
    (transactionsState.value === 'idle' || transactionsState.value === 'loading') &&
    !hasTransactionsInView.value
)
const shouldShowTransactionsErrorState = computed(
  () => transactionsState.value === 'error' && !hasTransactionsInView.value
)
const showTransactionsErrorInline = computed(
  () => transactionsState.value === 'error' && hasTransactionsInView.value
)
const transactionsErrorText = computed(
  () => transactionsError.value || 'Не удалось загрузить транзакции.'
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

const retryTransactions = () => {
  fetchFilteredTransactions({ page: 1 })
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

const resolveCategoryColor = (txn: EnrichedTransaction): string =>
  txn.categoryColor?.trim() || FALLBACK_CATEGORY_COLOR

const resolveCategoryIconStyle = (txn: EnrichedTransaction) => {
  const color = resolveCategoryColor(txn)
  return {
    backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
    color
  }
}
</script>

<template>
  <div
    class="txn-list"
    :class="{ 'txn-list--readonly': props.readonly }"
  >
    <UiCard
      class="txn-list__filters"
      padding="sm"
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
      v-if="shouldShowTransactionsSkeleton"
      class="txn-list__skeleton"
    >
      <Skeleton
        v-for="i in 6"
        :key="i"
        height="64px"
      />
    </div>

    <div
      v-else-if="shouldShowTransactionsErrorState"
      class="txn-list__error"
    >
      <Message severity="error">
        {{ transactionsErrorText }}
      </Message>
      <UiButton
        label="Повторить"
        icon="pi pi-refresh"
        variant="secondary"
        @click="retryTransactions"
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
      <div
        v-if="showTransactionsErrorInline"
        class="txn-list__error txn-list__error--inline"
      >
        <Message severity="error">
          {{ transactionsErrorText }} Показаны последние доступные данные.
        </Message>
        <UiButton
          label="Повторить"
          icon="pi pi-refresh"
          variant="secondary"
          @click="retryTransactions"
        />
      </div>

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
                  :style="resolveCategoryIconStyle(txn)"
                >
                  <span
                    class="txn-row__dot"
                    :style="{ backgroundColor: resolveCategoryColor(txn) }"
                  />
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
          class="txn-list__paginator"
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

<style scoped src="../styles/components/transaction-list.css"></style>
