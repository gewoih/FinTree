<script setup lang="ts">
import { computed, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import { useFinanceStore } from '../stores/finance'
import { PAGINATION_OPTIONS } from '../constants'
import { useTransactionFilters } from '../composables/useTransactionFilters'
import TransactionFilters from './TransactionFilters.vue'
import { formatCurrency, formatDate } from '../utils/formatters'
import type { Transaction } from '../types'
import { TRANSACTION_TYPE } from '../types'

const emit = defineEmits<{
  (e: 'add-transaction'): void
  (e: 'edit-transaction', transaction: Transaction): void
}>()

const store = useFinanceStore()

const transactionsLoading = computed(() => store.isTransactionsLoading)

const enrichedTransactions = computed(() =>
  store.transactions.map((txn: Transaction) => {
    const account = txn.account
    const category = txn.category

    const baseAmount = Number(txn.amount)
    const isIncome = txn.type === TRANSACTION_TYPE.Income
    const signedAmount = isIncome ? Math.abs(baseAmount) : -Math.abs(baseAmount)

    return {
      ...txn,
      accountName: account?.name,
      accountCurrency: account?.currency?.code ?? account?.currencyCode,
      accountSymbol: account?.currency?.symbol ?? '',
      categoryName: category?.name,
      categoryColor: category?.color,
      signedAmount,
      isMandatory: txn.isMandatory
    }
  })
)

const {
  searchText,
  selectedCategory,
  selectedAccount,
  dateRange,
  filteredTransactions,
  clearFilters: clearFiltersComposable
} = useTransactionFilters(() => enrichedTransactions.value)

const clearFilters = () => {
  clearFiltersComposable()
  store.fetchTransactions()
}

// При смене счета сразу подтягиваем свежие транзакции, чтобы таблица не показывала устаревшие данные.
watch(selectedAccount, account => {
  store.fetchTransactions(account?.id)
})

const isEmptyState = computed(
  () => !transactionsLoading.value && filteredTransactions.value.length === 0
)
</script>

<template>
  <div class="transaction-history">
    <AppCard class="transaction-history__filters" variant="muted" padding="lg">
      <TransactionFilters
        v-model:search-text="searchText"
        v-model:selected-category="selectedCategory"
        v-model:selected-account="selectedAccount"
        v-model:date-range="dateRange"
        :categories="store.categories"
        :accounts="store.accounts"
        @clear-filters="clearFilters"
      />
    </AppCard>

    <div v-if="transactionsLoading" class="table-skeleton">
      <Skeleton v-for="i in 6" :key="i" height="54px" />
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

    <div v-else class="table-shell transaction-history__table">
      <header class="table-shell__header">
        <div>
          <h3 class="table-shell__title">История транзакций</h3>
          <p class="table-shell__meta">
            {{ filteredTransactions.length }}
            {{ filteredTransactions.length === 1 ? 'транзакция' : filteredTransactions.length < 5 ? 'транзакции' : 'транзакций' }}
            по {{ store.accounts.length }}
            {{ store.accounts.length === 1 ? 'счету' : store.accounts.length < 5 ? 'счетам' : 'счетам' }}
          </p>
        </div>
        <div class="table-shell__actions">
          <AppButton
            variant="ghost"
            icon="pi pi-plus"
            label="Добавить"
            @click="emit('add-transaction')"
          />
        </div>
      </header>
      <div class="table-shell__body">
        <DataTable
          :value="filteredTransactions"
          sortField="occurredAt"
          :sortOrder="-1"
          stripedRows
          showGridlines
          responsiveLayout="scroll"
          :paginator="true"
          :rows="PAGINATION_OPTIONS.defaultRows"
          :rowsPerPageOptions="[...PAGINATION_OPTIONS.options]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Показано {first} - {last} из {totalRecords}"
          :globalFilterFields="['categoryName', 'accountName', 'description']"
          tableStyle="min-width: 760px"
        >
          <Column field="occurredAt" header="Дата" :sortable="true" style="min-width: 120px">
            <template #body="slotProps">
              <span class="date-cell">{{ formatDate(slotProps.data.occurredAt) }}</span>
            </template>
          </Column>

          <Column field="signedAmount" header="Сумма" :sortable="true" style="min-width: 160px">
            <template #body="slotProps">
              <div class="amount-cell" :class="{ negative: slotProps.data.signedAmount < 0 }">
                <span class="amount-value">
                  {{ slotProps.data.signedAmount < 0 ? '−' : '+' }}
                  {{ formatCurrency(Math.abs(slotProps.data.signedAmount), slotProps.data.accountCurrency) }}
                </span>
                <small class="amount-currency">
                  {{ slotProps.data.accountSymbol || slotProps.data.accountCurrency }}
                </small>
              </div>
            </template>
          </Column>

          <Column field="categoryName" header="Категория" :sortable="true" style="min-width: 180px">
            <template #body="slotProps">
              <div class="category-cell">
                <Tag
                  :value="slotProps.data.categoryName"
                  :style="{ backgroundColor: slotProps.data.categoryColor, color: '#fff' }"
                />
                <i
                  v-if="slotProps.data.isMandatory"
                  class="pi pi-lock mandatory-icon"
                  title="Обязательный платеж"
                />
              </div>
            </template>
          </Column>

          <Column field="accountName" header="Счет" :sortable="true" style="min-width: 160px">
            <template #body="slotProps">
              <div class="account-cell">
                <i class="pi pi-credit-card" aria-hidden="true" />
                <span>{{ slotProps.data.accountName }}</span>
              </div>
            </template>
          </Column>

          <Column field="description" header="Заметки" style="min-width: 220px">
            <template #body="slotProps">
              <span v-if="slotProps.data.description" class="description-text">
                {{ slotProps.data.description }}
              </span>
              <span v-else class="description-empty">—</span>
            </template>
          </Column>

          <Column header="Действия" style="min-width: 120px">
            <template #body="slotProps">
              <Button
                icon="pi pi-pencil"
                text
                rounded
                severity="secondary"
                @click="emit('edit-transaction', slotProps.data)"
                aria-label="Редактировать транзакцию"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transaction-history {
  display: flex;
  flex-direction: column;
  gap: clamp(var(--ft-space-4), 3vw, var(--ft-space-6));
}

.transaction-history__filters :deep(.transaction-filters),
.transaction-history__filters :deep(.filters-card) {
  gap: var(--ft-space-4);
}

.table-skeleton {
  display: grid;
  gap: var(--ft-space-2);
}

.transaction-history__table {
  gap: var(--ft-space-4);
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

:deep(.p-datatable .p-paginator .p-dropdown) {
  min-width: 6.5rem;
}
</style>

<style scoped>
.transaction-history {
  display: flex;
  flex-direction: column;
  gap: clamp(var(--ft-space-4), 3vw, var(--ft-space-6));
}

.transaction-history__filters :deep(.transaction-filters) {
  gap: var(--ft-space-4);
}

.table-skeleton {
  display: grid;
  gap: var(--ft-space-2);
}

.transaction-history__table {
  gap: var(--ft-space-4);
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

:deep(.p-datatable .p-paginator .p-dropdown) {
  min-width: 6.5rem;
}
</style>
