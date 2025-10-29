<script setup lang="ts">
import { useFinanceStore } from '../stores/finance';
import { computed, ref, watch } from 'vue';
import { PAGINATION_OPTIONS } from '../constants';
import type { Account, Category } from '../types.ts';

// PrimeVue Components
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import { formatDate, formatCurrency } from '../utils/formatters';

const store = useFinanceStore();

// Фильтры
const searchText = ref('');
const selectedCategory = ref<Category | null>(null);
const selectedAccount = ref<Account | null>(null);
const dateRange = ref<Date[] | null>(null);

const transactionsLoading = computed(() => store.isTransactionsLoading);

// Транзакции, обогащенные именем счета и категории
const enrichedTransactions = computed(() =>
  store.transactions.map(txn => {
    const account = txn.account ?? store.accounts.find(a => a.id === txn.accountId) ?? null;
    const category = txn.category ?? store.categories.find(c => c.id === txn.categoryId) ?? null;

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

// Отфильтрованные транзакции
const filteredTransactions = computed(() => {
  let filtered = enrichedTransactions.value;

  // Поиск по тексту
  if (searchText.value) {
    const search = searchText.value.toLowerCase();
    filtered = filtered.filter(txn =>
      txn.categoryName.toLowerCase().includes(search) ||
      txn.accountName.toLowerCase().includes(search) ||
      (txn.description && txn.description.toLowerCase().includes(search))
    );
  }

  // Фильтр по категории
  if (selectedCategory.value) {
    filtered = filtered.filter(txn => txn.categoryId === selectedCategory.value!.id);
  }

  // Фильтр по счету
  if (selectedAccount.value) {
    filtered = filtered.filter(txn => txn.accountId === selectedAccount.value!.id);
  }

  // Фильтр по дате
  if (dateRange.value && dateRange.value.length === 2) {
    const [startDate, endDate] = dateRange.value as [Date, Date];
    filtered = filtered.filter(txn => {
      const txnDate = new Date(txn.occuredAt);
      return txnDate >= startDate && txnDate <= endDate;
    });
  }

  return filtered;
});

// Опции для фильтров
const categoryOptions = computed(() => [
  { label: 'Все категории', value: null },
  ...store.categories.map(cat => ({ label: cat.name, value: cat }))
]);

const accountOptions = computed(() => [
  { label: 'Все счета', value: null },
  ...store.accounts.map(acc => ({ label: acc.name, value: acc }))
]);

// Сброс фильтров
const clearFilters = () => {
  searchText.value = '';
  selectedCategory.value = null;
  selectedAccount.value = null;
  dateRange.value = null;
  store.fetchTransactions();
};

watch(selectedAccount, account => {
  store.fetchTransactions(account?.id);
});
</script>

<template>
  <div class="transaction-history">
    <!-- Фильтры -->
    <div class="filters-panel ft-card ft-card--muted">
      <div class="filters-grid">
        <div class="filter-field filter-field--wide">
          <label>Поиск</label>
          <InputText
            v-model="searchText"
            placeholder="Поиск по категории, счету или примечанию..."
            class="w-full"
          />
        </div>
        <div class="filter-field">
          <label>Категория</label>
          <Select
            v-model="selectedCategory"
            :options="categoryOptions"
            option-label="label"
            option-value="value"
            placeholder="Все категории"
            class="w-full"
          />
        </div>
        <div class="filter-field">
          <label>Счет</label>
          <Select
            v-model="selectedAccount"
            :options="accountOptions"
            option-label="label"
            option-value="value"
            placeholder="Все счета"
            class="w-full"
          />
        </div>
        <div class="filter-field">
          <label>Период</label>
          <DatePicker
            v-model="dateRange"
            selectionMode="range"
            :manualInput="false"
            placeholder="Выберите период"
            class="w-full"
          />
        </div>
        <div class="filter-field filter-field--compact">
          <label class="sr-only">Сбросить фильтры</label>
          <Button
            label="Сбросить"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            @click="clearFilters"
            class="w-full"
          />
        </div>
      </div>
    </div>

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
      <Column field="occuredAt" header="Дата" :sortable="true" style="min-width: 110px">
        <template #body="slotProps">
          <div class="date-cell">{{ formatDate(slotProps.data.occuredAt) }}</div>
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

.filters-panel {
  gap: clamp(1rem, 1.5vw, 1.35rem);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: clamp(0.85rem, 1.2vw, 1.3rem);
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ft-text-muted);
}

.filter-field--wide {
  grid-column: span 2;
}

.filter-field--compact :deep(.p-button) {
  height: 100%;
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

@media (max-width: 768px) {
  .filter-field--wide {
    grid-column: span 1;
  }
}
</style>
