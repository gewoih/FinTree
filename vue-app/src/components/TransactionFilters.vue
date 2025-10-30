<script setup lang="ts">
import { computed } from 'vue';
import type { Account, Category } from '../types';

// PrimeVue Components
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';

const props = defineProps<{
  searchText: string;
  selectedCategory: Category | null;
  selectedAccount: Account | null;
  dateRange: Date[] | null;
  categories: Category[];
  accounts: Account[];
}>();

const emit = defineEmits([
  'update:searchText',
  'update:selectedCategory',
  'update:selectedAccount',
  'update:dateRange',
  'clearFilters'
]);

// Category options with "All" option
const categoryOptions = computed(() => [
  { label: 'Все категории', value: null },
  ...props.categories.map(cat => ({ label: cat.name, value: cat }))
]);

// Account options with "All" option
const accountOptions = computed(() => [
  { label: 'Все счета', value: null },
  ...props.accounts.map(acc => ({ label: acc.name, value: acc }))
]);
</script>

<template>
  <div class="filters-panel ft-card ft-card--muted">
    <div class="filters-grid">
      <div class="filter-field filter-field--wide">
        <label>Поиск</label>
        <InputText
          :model-value="props.searchText"
          @update:model-value="(val) => emit('update:searchText', val)"
          placeholder="Поиск по категории, счету или примечанию..."
          class="w-full"
        />
      </div>

      <div class="filter-field">
        <label>Категория</label>
        <Select
          :model-value="props.selectedCategory"
          @update:model-value="(val) => emit('update:selectedCategory', val)"
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
          :model-value="props.selectedAccount"
          @update:model-value="(val) => emit('update:selectedAccount', val)"
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
          :model-value="props.dateRange"
          @update:model-value="(val) => emit('update:dateRange', val as Date[] | null)"
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
          @click="emit('clearFilters')"
          class="w-full"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
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

@media (max-width: 768px) {
  .filter-field--wide {
    grid-column: span 1;
  }
}
</style>
