<script setup lang="ts">
import { useFinanceStore } from '../stores/finance';
import { computed, watch } from 'vue';
import { PAGINATION_OPTIONS } from '../constants';
import { useTransactionFilters } from '../composables/useTransactionFilters';

// Components
import TransactionFilters from './TransactionFilters.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import { formatDate, formatCurrency } from '../utils/formatters';

const store = useFinanceStore();

const transactionsLoading = computed(() => store.isTransactionsLoading);

/**
 * Enriched transactions with computed display values
 * Note: Store already provides enriched data with account and category objects
 */
const enrichedTransactions = computed(() =>
  store.transactions.map(txn => {
    const account = txn.account;
    const category = txn.category;

    const baseAmount = Number(txn.amount);
    const signedAmount = baseAmount > 0 ? -Math.abs(baseAmount) : baseAmount;

    return {
      ...txn,
      accountName: account?.name ?? 'Неизвестный счет',
      accountCurrency: account?.currency?.code ?? account?.currencyCode ?? 'KZT',
      accountSymbol: account?.currency?.symbol ?? '',
      categoryName: category?.name ?? 'Нет категории',
      categoryColor: category?.color ?? '#6c757d',
      signedAmount,
    };
  })
);

// Use the transaction filters composable
const {
  searchText,
  selectedCategory,
  selectedAccount,
  dateRange,
  filteredTransactions,
  clearFilters: clearFiltersComposable
} = useTransactionFilters(() => enrichedTransactions.value);

// Clear filters and refetch all transactions
const clearFilters = () => {
  clearFiltersComposable();
  store.fetchTransactions();
};

// Watch for account selection changes and refetch transactions
watch(selectedAccount, account => {
  store.fetchTransactions(account?.id);
});
</script>

<template>
  <div class="transaction-history">
    <!-- Фильтры -->
    <TransactionFilters
      v-model:search-text="searchText"
      v-model:selected-category="selectedCategory"
      v-model:selected-account="selectedAccount"
      v-model:date-range="dateRange"
      :categories="store.categories"
      :accounts="store.accounts"
      @clear-filters="clearFilters"
    />

    <!-- Таблица транзакций -->
    <div v-if="transactionsLoading" class="loading-state">
      <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" animationDuration=".5s" />
      <p>Загрузка данных...</p>
    </div>

    <div v-else-if="filteredTransactions.length === 0" class="ft-empty">
      <i class="pi pi-database"></i>
      <p>Транзакции не найдены. Попробуйте изменить фильтры или добавить новый расход.</p>
    </div>

    <DataTable
        v-else
        :value="filteredTransactions"
        sortField="occuredAt"
        :sortOrder="-1"
        stripedRows
        :paginator="true"
        :rows="PAGINATION_OPTIONS.defaultRows"
        :rowsPerPageOptions="[...PAGINATION_OPTIONS.options]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Показано {first} - {last} из {totalRecords} записей"
        :globalFilterFields="['categoryName', 'accountName', 'description']"
        responsiveLayout="scroll"
    >
      <Column field="occurredAt" header="Дата" :sortable="true" style="min-width: 110px">
        <template #body="slotProps">
          <div class="date-cell">{{ formatDate(slotProps.data.occurredAt) }}</div>
        </template>
      </Column>

      <Column field="signedAmount" header="Сумма" :sortable="true" style="min-width: 150px">
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

      <Column field="categoryName" header="Категория" :sortable="true" style="min-width: 140px">
        <template #body="slotProps">
          <Tag
            :value="slotProps.data.categoryName"
            :style="{ backgroundColor: slotProps.data.categoryColor, color: 'white' }"
          />
        </template>
      </Column>

      <Column field="accountName" header="Счет" :sortable="true" style="min-width: 130px">
        <template #body="slotProps">
          <div class="account-cell">
            <i class="pi pi-credit-card"></i>
            <span>{{ slotProps.data.accountName }}</span>
          </div>
        </template>
      </Column>

      <Column field="description" header="Примечание" style="min-width: 160px">
        <template #body="slotProps">
          <span v-if="slotProps.data.description" class="description-text">
            {{ slotProps.data.description }}
          </span>
          <span v-else class="description-empty">—</span>
        </template>
      </Column>
    </DataTable>

  </div>
</template>

<style scoped>
.transaction-history {
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 2vw, 2rem);
}

.loading-state {
  display: grid;
  place-items: center;
  gap: 0.6rem;
  padding: 2rem;
  color: var(--ft-text-muted);
}

.loading-state p {
  margin: 0;
}

.date-cell {
  font-weight: 600;
  color: var(--ft-heading);
}

.amount-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  font-weight: 600;
  color: #16a34a;
}

.amount-cell.negative {
  color: #dc2626;
}

.amount-value {
  font-size: 1rem;
}

.amount-currency {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ft-text-muted);
}

.account-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ft-heading);
}

.account-cell i {
  color: var(--ft-text-muted);
}

.description-text {
  color: var(--ft-text);
}

.description-empty {
  color: var(--ft-text-muted);
  font-style: italic;
}
</style>
