<script setup lang="ts">
import { computed } from 'vue';
import type { Account, Category } from '../types';

// Common components
import FormField from './common/FormField.vue';
import AppButton from './common/AppButton.vue';

// PrimeVue Components
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';

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
  { label: 'All categories', value: null },
  ...props.categories.map(cat => ({ label: cat.name, value: cat }))
]);

// Account options with "All" option
const accountOptions = computed(() => [
  { label: 'All accounts', value: null },
  ...props.accounts.map(acc => ({ label: acc.name, value: acc }))
]);
</script>

<template>
  <div class="filters-panel transaction-filters">
    <div class="filters-grid">
      <FormField class="filter-field filter-field--wide" label="Поиск">
        <template #default="{ fieldAttrs }">
          <InputText
            :id="fieldAttrs.id"
            :model-value="props.searchText"
            @update:model-value="val => emit('update:searchText', val ?? '')"
            placeholder="Категория, счёт или заметка…"
            class="w-full"
            autocomplete="off"
          />
        </template>
      </FormField>

      <FormField class="filter-field" label="Категория">
        <template #default="{ fieldAttrs }">
          <Select
            :model-value="props.selectedCategory"
            @update:model-value="val => emit('update:selectedCategory', val)"
            :options="categoryOptions"
            option-label="label"
            option-value="value"
            placeholder="Все категории"
            class="w-full"
            :inputId="fieldAttrs.id"
          />
        </template>
      </FormField>

      <FormField class="filter-field" label="Счёт">
        <template #default="{ fieldAttrs }">
          <Select
            :model-value="props.selectedAccount"
            @update:model-value="val => emit('update:selectedAccount', val)"
            :options="accountOptions"
            option-label="label"
            option-value="value"
            placeholder="Все счета"
            class="w-full"
            :inputId="fieldAttrs.id"
          />
        </template>
      </FormField>

      <FormField class="filter-field" label="Диапазон дат">
        <template #default="{ fieldAttrs }">
          <DatePicker
            :model-value="props.dateRange"
            @update:model-value="val => emit('update:dateRange', val as Date[] | null)"
            selection-mode="range"
            :manual-input="false"
            date-format="dd.mm.yy"
            placeholder="Выберите период"
            show-button-bar
            class="w-full"
            :inputId="fieldAttrs.id"
          />
        </template>
      </FormField>

      <FormField class="filter-field filter-field--compact" label="Сбросить фильтры" label-sr-only>
        <template #default>
          <AppButton
            icon="pi pi-refresh"
            variant="ghost"
            block
            @click="emit('clearFilters')"
          >
            Сбросить
          </AppButton>
        </template>
      </FormField>
    </div>
  </div>
</template>

<style scoped>
.filters-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--ft-layout-card-gap);
  align-items: end;
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

.filter-field--compact :deep(.app-button) {
  min-height: var(--ft-input-height-md);
}

@media (max-width: 768px) {
  .filter-field--wide {
    grid-column: span 1;
  }
}
</style>
