<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Account, Category } from '../types';
import UiInputText from '../ui/UiInputText.vue';
import UiSelect from '../ui/UiSelect.vue';
import UiDatePicker from '../ui/UiDatePicker.vue';
import { useViewport } from '../composables/useViewport';

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

const { isMobile } = useViewport();
const isOpen = ref(false);

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

const activeFilterCount = computed(() => {
  let count = 0;
  if (props.searchText.trim() !== '') count++;
  if (props.selectedCategory !== null) count++;
  if (props.selectedAccount !== null) count++;
  if (props.dateRange !== null && props.dateRange.length > 0) count++;
  return count;
});

const controlsVisible = computed(() => !isMobile.value || isOpen.value);
</script>

<template>
  <div class="transaction-filters">
    <button
      v-if="isMobile"
      type="button"
      class="transaction-filters__toggle"
      :class="{ 'is-active': isOpen }"
      @click="isOpen = !isOpen"
    >
      <i class="pi pi-sliders-h" aria-hidden="true" />
      <span>Фильтры</span>
      <span
        v-if="activeFilterCount > 0"
        class="transaction-filters__badge"
      >{{ activeFilterCount }}</span>
      <i
        class="pi pi-chevron-down transaction-filters__toggle-chevron"
        :class="{ 'is-open': isOpen }"
        aria-hidden="true"
      />
    </button>

    <div
      v-show="controlsVisible"
      class="transaction-filters__controls"
    >
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
  </div>
</template>

<style scoped>
.transaction-filters {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.transaction-filters__toggle {
  cursor: pointer;

  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  width: 100%;
  height: var(--ft-input-height-sm);
  padding: 0 var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);

  background: none;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-md);

  transition:
    color var(--ft-transition-fast),
    border-color var(--ft-transition-fast);
}

.transaction-filters__toggle.is-active,
.transaction-filters__toggle:hover {
  color: var(--ft-text-primary);
  border-color: var(--ft-border-default);
}

.transaction-filters__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-width: 18px;
  height: 18px;
  padding: 0 var(--ft-space-1);

  font-size: 11px;
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-inverse);

  background: var(--ft-interactive-default);
  border-radius: var(--ft-radius-full);
}

.transaction-filters__toggle-chevron {
  margin-left: auto;
  font-size: var(--ft-text-xs);
  transition: transform var(--ft-transition-fast);
}

.transaction-filters__toggle-chevron.is-open {
  transform: rotate(180deg);
}

.transaction-filters__controls {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(150px, 200px) minmax(150px, 200px) minmax(150px, 200px) auto;
  gap: var(--ft-space-3);
  align-items: center;
}

.transaction-filters__search {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  min-height: var(--ft-input-height-sm);
  padding: 0 var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-md);

  transition:
    border-color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.transaction-filters__search:focus-within {
  border-color: var(--ft-border-strong);
  box-shadow:
    0 0 0 3px var(--ft-focus-ring),
    var(--ft-shadow-xs);
}

.transaction-filters__search i {
  flex-shrink: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
}

.transaction-filters__search :deep(.ui-input),
.transaction-filters__search :deep(.p-inputtext) {
  flex: 1;

  padding-left: 0;

  background: transparent;
  border: none;
  box-shadow: none !important;
}

.transaction-filters__search :deep(.ui-input:focus),
.transaction-filters__search :deep(.ui-input:focus-visible),
.transaction-filters__search :deep(.p-inputtext:focus),
.transaction-filters__search :deep(.p-inputtext:focus-visible) {
  border: none !important;
  outline: none;
  box-shadow: none !important;
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

  width: 44px;
  height: 44px;
  padding: 0;

  color: var(--ft-text-tertiary);

  background: none;
  border: none;
  border-radius: var(--ft-radius-md);

  transition:
    color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

.transaction-filters__clear:hover {
  color: var(--ft-text-primary);
  background: var(--ft-surface-muted);
}

@media (width <= 768px) {
  .transaction-filters__controls {
    grid-template-columns: 1fr 1fr;
  }

  .transaction-filters__search {
    grid-column: 1 / -1;
  }
}

@media (width <= 640px) {
  .transaction-filters__controls {
    grid-template-columns: 1fr;
  }
}
</style>
