<script setup lang="ts">
import { computed } from 'vue';
import type { Account, Category } from '../types';

// Common components
import FormField from './common/FormField.vue';

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
      <FormField class="filter-field filter-field--search" label="Поиск">
        <template #default="{ fieldAttrs }">
          <UiInputText
            :id="fieldAttrs.id"
            :model-value="props.searchText"
            @update:model-value="val => emit('update:searchText', val ?? '')"
            placeholder="Категория, счёт или заметка…"
            autocomplete="off"
          />
        </template>
      </FormField>

      <div class="filters-grid__controls">
        <FormField class="filter-field" label="Категория">
          <template #default="{ fieldAttrs }">
            <UiSelect
              :model-value="props.selectedCategory"
              @update:model-value="val => emit('update:selectedCategory', val)"
              :options="categoryOptions"
              option-label="label"
              option-value="value"
              placeholder="Все категории"
              :inputId="fieldAttrs.id"
            />
          </template>
        </FormField>

        <FormField class="filter-field" label="Счёт">
          <template #default="{ fieldAttrs }">
            <UiSelect
              :model-value="props.selectedAccount"
              @update:model-value="val => emit('update:selectedAccount', val)"
              :options="accountOptions"
              option-label="label"
              option-value="value"
              placeholder="Все счета"
              :inputId="fieldAttrs.id"
            />
          </template>
        </FormField>

        <FormField class="filter-field" label="Диапазон дат">
          <template #default="{ fieldAttrs }">
            <UiDatePicker
              :model-value="props.dateRange"
              @update:model-value="val => emit('update:dateRange', val as Date[] | null)"
              selection-mode="range"
              :manual-input="false"
              date-format="dd.mm.yy"
              placeholder="Выберите период"
              show-button-bar
              :inputId="fieldAttrs.id"
            />
          </template>
        </FormField>

        <FormField class="filter-field filter-field--compact" label="Сбросить фильтры" label-sr-only>
          <template #default>
            <UiButton
              icon="pi pi-refresh"
              variant="ghost"
              block
              @click="emit('clearFilters')"
            >
              Сбросить
            </UiButton>
          </template>
        </FormField>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filters-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.filters-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  gap: var(--space-5);
  align-items: end;
}

.filters-grid__controls {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: var(--space-4);
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

.filter-field--compact :deep(.ui-button) {
  min-height: var(--control-height);
}

@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }

  .filters-grid__controls {
    grid-template-columns: 1fr;
  }
}
</style>
