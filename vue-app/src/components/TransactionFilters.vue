<script setup lang="ts">
import { computed } from 'vue';
import type { Account, Category } from '../types';
import UiInputText from '../ui/UiInputText.vue';
import UiSelect from '../ui/UiSelect.vue';
import UiDatePicker from '../ui/UiDatePicker.vue';

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

const categoryOptions = computed(() => [
  { label: 'Все категории', value: null },
  ...props.categories.map(cat => ({ label: cat.name, value: cat }))
]);

const accountOptions = computed(() => [
  { label: 'Все счета', value: null },
  ...props.accounts.map(acc => ({ label: acc.name, value: acc }))
]);

const handleSearchUpdate = (value: string | null | undefined) => {
  emit('update:searchText', value ?? '');
};

const handleCategoryUpdate = (value: unknown) => {
  emit('update:selectedCategory', (value as Category | null) ?? null);
};

const handleAccountUpdate = (value: unknown) => {
  emit('update:selectedAccount', (value as Account | null) ?? null);
};

const handleDateRangeUpdate = (
  value: Date | Date[] | (Date | null)[] | null | undefined
) => {
  if (!value) {
    emit('update:dateRange', null);
    return;
  }
  if (Array.isArray(value)) {
    const dates = value.filter((item): item is Date => item instanceof Date);
    emit('update:dateRange', dates.length ? dates : null);
    return;
  }
  emit('update:dateRange', [value]);
};

const hasActiveFilters = computed(() =>
  props.searchText.trim() !== '' ||
  props.selectedCategory !== null ||
  props.selectedAccount !== null ||
  (props.dateRange !== null && props.dateRange.length > 0)
);
</script>

<template>
  <div class="transaction-filters">
    <div class="transaction-filters__search">
      <i class="pi pi-search" />
      <UiInputText
        :model-value="props.searchText"
        placeholder="Поиск…"
        autocomplete="off"
        @update:model-value="handleSearchUpdate"
      />
    </div>

    <UiSelect
      :model-value="props.selectedCategory"
      :options="categoryOptions"
      option-label="label"
      option-value="value"
      placeholder="Категория"
      class="transaction-filters__control"
      @update:model-value="handleCategoryUpdate"
    />

    <UiSelect
      :model-value="props.selectedAccount"
      :options="accountOptions"
      option-label="label"
      option-value="value"
      placeholder="Счёт"
      class="transaction-filters__control"
      @update:model-value="handleAccountUpdate"
    />

    <UiDatePicker
      :model-value="props.dateRange"
      selection-mode="range"
      :manual-input="false"
      date-format="dd.mm.yy"
      placeholder="Период"
      show-button-bar
      class="transaction-filters__control"
      @update:model-value="handleDateRangeUpdate"
    />

    <button
      v-if="hasActiveFilters"
      type="button"
      class="transaction-filters__clear"
      aria-label="Сбросить фильтры"
      @click="emit('clearFilters')"
    >
      <i class="pi pi-times" />
    </button>
  </div>
</template>

<style scoped>
.transaction-filters {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(150px, 200px) minmax(150px, 200px) minmax(150px, 200px) auto;
  gap: var(--ft-space-3);
  align-items: center;
}

.transaction-filters__search {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  min-height: 44px;
  padding: 0 var(--ft-space-3);

  background: var(--ft-surface-0, var(--ft-surface-base));
  border: 1px solid var(--ft-border-default, var(--ft-border-soft));
  border-radius: var(--ft-radius-md);
}

.transaction-filters__search i {
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-sm);
  flex-shrink: 0;
}

.transaction-filters__search :deep(.p-inputtext) {
  flex: 1;
  background: transparent;
  border: none;
  box-shadow: none;
  padding-left: 0;
}

.transaction-filters__control {
  min-width: 0;
}

.transaction-filters__clear {
  cursor: pointer;

  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  width: 36px;
  height: 36px;
  padding: 0;

  color: var(--ft-text-tertiary);

  background: none;
  border: none;
  border-radius: var(--ft-radius-md);

  transition: color 0.15s, background-color 0.15s;
}

.transaction-filters__clear:hover {
  color: var(--ft-text-primary);
  background: var(--ft-surface-muted);
}

@media (width <= 768px) {
  .transaction-filters {
    grid-template-columns: 1fr 1fr;
  }

  .transaction-filters__search {
    grid-column: 1 / -1;
  }
}

@media (width <= 640px) {
  .transaction-filters {
    grid-template-columns: 1fr;
  }
}
</style>
