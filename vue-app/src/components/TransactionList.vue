<script setup lang="ts">
import { useFinanceStore } from '../stores/finance';
import { computed, ref } from 'vue';
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

// Транзакции, обогащенные именем счета и категории
const enrichedTransactions = computed(() => {
  return store.transactions.map(txn => {
    const account = store.accounts.find(a => a.id === txn.accountId);
    const category = store.categories.find(c => c.id === txn.categoryId);

    return {
      ...txn,
      accountName: account?.name || 'Неизвестный Счет',
      categoryName: category?.name || 'Нет Категории',
      currency: account?.currency || 'KZT',
      categoryColor: category?.color || '#6c757d'
    };
  });
});

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
};

// Статистика
const totalExpenses = computed(() => {
  return filteredTransactions.value
    .filter(txn => txn.amount < 0)
    .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
});

const totalIncome = computed(() => {
  return filteredTransactions.value
    .filter(txn => txn.amount > 0)
    .reduce((sum, txn) => sum + txn.amount, 0);
});
</script>

<template>
  <div class="transaction-history">
    <!-- Статистика -->
    <div v-if="!store.isLoading && enrichedTransactions.length > 0" class="grid mb-4">
      <div class="col-12 md:col-4">
        <div class="stat-card p-3 border-round bg-green-50">
          <div class="text-green-600 font-semibold">Доходы</div>
          <div class="text-2xl font-bold text-green-700">
            {{ formatCurrency(totalIncome, 'KZT') }}
          </div>
        </div>
      </div>
      <div class="col-12 md:col-4">
        <div class="stat-card p-3 border-round bg-red-50">
          <div class="text-red-600 font-semibold">Расходы</div>
          <div class="text-2xl font-bold text-red-700">
            {{ formatCurrency(totalExpenses, 'KZT') }}
          </div>
        </div>
      </div>
      <div class="col-12 md:col-4">
        <div class="stat-card p-3 border-round bg-blue-50">
          <div class="text-blue-600 font-semibold">Баланс</div>
          <div class="text-2xl font-bold text-blue-700">
            {{ formatCurrency(totalIncome - totalExpenses, 'KZT') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Фильтры -->
    <div v-if="!store.isLoading && enrichedTransactions.length > 0" class="filters-panel p-3 mb-4 border-round surface-100">
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
    <div v-if="store.isLoading" class="text-center p-4">
      <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" animationDuration=".5s" />
      <p class="mt-2">Загрузка данных...</p>
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
      
      <Column field="amount" header="Сумма" :sortable="true" style="min-width: 120px">
        <template #body="slotProps">
          <div class="text-right">
            <span :class="slotProps.data.amount < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'">
              {{ slotProps.data.amount < 0 ? '-' : '+' }}{{ formatCurrency(Math.abs(slotProps.data.amount), slotProps.data.currency) }}
            </span>
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

    <!-- Пустое состояние -->
    <div v-if="!store.isLoading && enrichedTransactions.length === 0" class="text-center p-6">
      <i class="pi pi-inbox text-6xl text-400 mb-3"></i>
      <h3 class="text-500 mb-2">Нет транзакций</h3>
      <p class="text-400">Добавьте первую транзакцию, чтобы начать ведение учета</p>
    </div>
    
    <div v-else-if="!store.isLoading && filteredTransactions.length === 0 && enrichedTransactions.length > 0" class="text-center p-6">
      <i class="pi pi-search text-6xl text-400 mb-3"></i>
      <h3 class="text-500 mb-2">Транзакции не найдены</h3>
      <p class="text-400">Попробуйте изменить фильтры поиска</p>
    </div>
  </div>
</template>

<style scoped>
/* TransactionList specific styles */
.stat-card {
  border: 1px solid var(--surface-border);
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.filters-panel {
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
}
</style>
