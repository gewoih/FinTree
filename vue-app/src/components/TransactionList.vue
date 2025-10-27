<script setup lang="ts">
import { useFinanceStore } from '../stores/finance';
import { computed, ref, watch, onMounted } from 'vue';
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
      accountCurrency: account?.currency?.code ?? 'KZT',
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

onMounted(() => {
  if (!store.transactions.length) {
    store.fetchTransactions();
  }
});

watch(selectedAccount, account => {
  store.fetchTransactions(account?.id);
});
</script>

<template>
  <div class="transaction-history">
    <!-- Фильтры -->
    <div class="filters-panel p-3 mb-4 border-round surface-100">
      <div class="grid">
        <div class="col-12 md:col-3">
          <label class="block text-sm font-medium mb-2">Поиск</label>
          <InputText 
            v-model="searchText" 
            placeholder="Поиск по категории, счету или примечанию..."
            class="w-full"
          />
        </div>
        <div class="col-12 md:col-2">
          <label class="block text-sm font-medium mb-2">Категория</label>
          <Select 
            v-model="selectedCategory" 
            :options="categoryOptions"
            option-label="label"
            option-value="value"
            placeholder="Все категории"
            class="w-full"
          />
        </div>
        <div class="col-12 md:col-2">
          <label class="block text-sm font-medium mb-2">Счет</label>
          <Select 
            v-model="selectedAccount" 
            :options="accountOptions"
            option-label="label"
            option-value="value"
            placeholder="Все счета"
            class="w-full"
          />
        </div>
        <div class="col-12 md:col-3">
          <label class="block text-sm font-medium mb-2">Период</label>
          <DatePicker 
            v-model="dateRange" 
            selectionMode="range" 
            :manualInput="false"
            placeholder="Выберите период"
            class="w-full"
          />
        </div>
        <div class="col-12 md:col-2">
          <label class="block text-sm font-medium mb-2">&nbsp;</label>
          <Button 
            label="Сбросить" 
            icon="pi pi-refresh" 
            severity="secondary"
            @click="clearFilters"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- Таблица транзакций -->
    <div v-if="transactionsLoading" class="text-center p-4">
      <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" animationDuration=".5s" />
      <p class="mt-2">Загрузка данных...</p>
    </div>

    <div v-else-if="filteredTransactions.length === 0" class="empty-state">
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
      <Column field="occuredAt" header="Дата" :sortable="true" style="min-width: 100px">
        <template #body="slotProps">
          <div class="font-medium">{{ formatDate(slotProps.data.occuredAt) }}</div>
        </template>
      </Column>
      
      <Column field="signedAmount" header="Сумма" :sortable="true" style="min-width: 140px">
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
      
      <Column field="categoryName" header="Категория" :sortable="true" style="min-width: 120px">
        <template #body="slotProps">
          <Tag 
            :value="slotProps.data.categoryName" 
            :style="{ backgroundColor: slotProps.data.categoryColor, color: 'white' }"
          />
        </template>
      </Column>
      
      <Column field="accountName" header="Счет" :sortable="true" style="min-width: 100px">
        <template #body="slotProps">
          <div class="flex align-items-center">
            <i class="pi pi-credit-card mr-2 text-500"></i>
            {{ slotProps.data.accountName }}
          </div>
        </template>
      </Column>
      
      <Column field="description" header="Примечание" style="min-width: 150px">
        <template #body="slotProps">
          <span v-if="slotProps.data.description" class="text-600">
            {{ slotProps.data.description }}
          </span>
          <span v-else class="text-400 italic">—</span>
        </template>
      </Column>
    </DataTable>

  </div>
</template>

<style scoped>
.filters-panel {
  background: rgba(248, 250, 252, 0.72);
  border: 1px solid var(--ft-border-soft);
  border-radius: 18px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

.empty-state {
  border: 1px dashed var(--surface-border);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  color: var(--text-color-secondary);
  display: grid;
  gap: 0.5rem;
  place-items: center;
}

.empty-state i {
  font-size: 2rem;
  color: var(--text-color-secondary);
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
</style>
