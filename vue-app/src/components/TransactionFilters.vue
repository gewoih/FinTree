<script setup lang="ts">
import { computed } from 'vue'
import type { Account, Category } from '../types'
import UiInputText from '../ui/UiInputText.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiDatePicker from '../ui/UiDatePicker.vue'

const props = defineProps<{
  searchText: string
  selectedCategory: Category | null
  selectedAccount: Account | null
  dateRange: Date[] | null
  categories: Category[]
  accounts: Account[]
}>()

const emit = defineEmits([
  'update:searchText',
  'update:selectedCategory',
  'update:selectedAccount',
  'update:dateRange',
  'clearFilters'
])

const categoryOptions = computed(() => [
  { label: 'Все категории', value: null },
  ...props.categories.map(cat => ({ label: cat.name, value: cat }))
])

const accountOptions = computed(() => [
  { label: 'Все счета', value: null },
  ...props.accounts.map(acc => ({ label: acc.name, value: acc }))
])

const handleSearchUpdate = (value: string | null | undefined) => {
  emit('update:searchText', value ?? '')
}

const handleCategoryUpdate = (value: unknown) => {
  emit('update:selectedCategory', (value as Category | null) ?? null)
}

const handleAccountUpdate = (value: unknown) => {
  emit('update:selectedAccount', (value as Account | null) ?? null)
}

const handleDateRangeUpdate = (
  value: Date | Date[] | (Date | null)[] | null | undefined
) => {
  if (!value) {
    emit('update:dateRange', null)
    return
  }
  if (Array.isArray(value)) {
    const dates = value.filter((item): item is Date => item instanceof Date)
    emit('update:dateRange', dates.length ? dates : null)
    return
  }
  emit('update:dateRange', [value])
}

const hasActiveFilters = computed(() =>
  props.searchText.trim() !== '' ||
  props.selectedCategory !== null ||
  props.selectedAccount !== null ||
  (props.dateRange !== null && props.dateRange.length > 0)
)
</script>

<template>
  <div class="transaction-filters">
    <div class="transaction-filters__controls">
      <!-- Search -->
      <div class="filter-control filter-control--search">
        <label
          for="transaction-search"
          class="sr-only"
        >
          Поиск транзакций
        </label>
        <div class="filter-input">
          <i
            class="pi pi-search filter-input__icon"
            aria-hidden="true"
          />
          <UiInputText
            id="transaction-search"
            :model-value="props.searchText"
            placeholder="Поиск..."
            autocomplete="off"
            class="filter-input__field"
            @update:model-value="handleSearchUpdate"
          />
        </div>
      </div>

      <!-- Category -->
      <div class="filter-control">
        <label
          for="transaction-category"
          class="sr-only"
        >
          Категория
        </label>
        <UiSelect
          id="transaction-category"
          :model-value="props.selectedCategory"
          :options="categoryOptions"
          option-label="label"
          option-value="value"
          placeholder="Категория"
          class="filter-select"
          @update:model-value="handleCategoryUpdate"
        />
      </div>

      <!-- Account -->
      <div class="filter-control">
        <label
          for="transaction-account"
          class="sr-only"
        >
          Счёт
        </label>
        <UiSelect
          id="transaction-account"
          :model-value="props.selectedAccount"
          :options="accountOptions"
          option-label="label"
          option-value="value"
          placeholder="Счёт"
          class="filter-select"
          @update:model-value="handleAccountUpdate"
        />
      </div>

      <!-- Date Range -->
      <div class="filter-control">
        <label
          for="transaction-date"
          class="sr-only"
        >
          Период
        </label>
        <UiDatePicker
          id="transaction-date"
          :model-value="props.dateRange"
          selection-mode="range"
          :manual-input="false"
          date-format="dd.mm.yy"
          placeholder="Период"
          show-button-bar
          class="filter-datepicker"
          @update:model-value="handleDateRangeUpdate"
        />
      </div>

      <!-- Clear Button -->
      <div class="filter-control filter-control--action">
        <button
          v-if="hasActiveFilters"
          type="button"
          class="filter-clear-btn"
          aria-label="Сбросить все фильтры"
          @click="emit('clearFilters')"
        >
          <i class="pi pi-times" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transaction-filters {
  width: 100%;
}

.transaction-filters__controls {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(150px, 200px) minmax(150px, 200px) minmax(150px, 200px) auto;
  gap: var(--ft-space-3);
  align-items: center;

  padding: var(--ft-space-5);

  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-950) 40%, transparent),
    color-mix(in srgb, var(--ft-primary-900) 25%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--ft-primary-400) 12%, transparent);
  border-radius: var(--ft-radius-xl);
  box-shadow:
    0 4px 16px rgb(0 0 0 / 15%),
    inset 0 1px 0 color-mix(in srgb, var(--ft-primary-300) 6%, transparent);

  backdrop-filter: blur(12px);
}

.filter-control {
  position: relative;
  min-width: 0;
}

.filter-control--search {
  min-width: 200px;
}

.filter-control--action {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
}

.sr-only {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  white-space: nowrap;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

/* Premium Search Input */
.filter-input {
  position: relative;

  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  min-height: 44px;
  padding: var(--ft-space-3) var(--ft-space-4);

  background: color-mix(in srgb, var(--ft-surface-base) 85%, transparent);
  border: 1px solid color-mix(in srgb, var(--ft-border-default) 60%, transparent);
  border-radius: var(--ft-radius-lg);
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);

  backdrop-filter: blur(8px);

  transition:
    all var(--ft-transition-fast),
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-input:hover {
  background: color-mix(in srgb, var(--ft-surface-base) 95%, transparent);
  border-color: color-mix(in srgb, var(--ft-border-strong) 80%, transparent);
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
  transform: translateY(-2px);
}

.filter-input:focus-within {
  background: var(--ft-surface-base);
  border-color: var(--ft-primary-500);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--ft-primary-500) 15%, transparent),
    0 6px 16px rgb(0 0 0 / 20%);
  transform: translateY(-2px);
}

.filter-input__icon {
  flex-shrink: 0;
  font-size: 1.125rem;
  color: var(--ft-text-tertiary);

  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-input:hover .filter-input__icon {
  color: var(--ft-text-secondary);
  transform: scale(1.05);
}

.filter-input:focus-within .filter-input__icon {
  color: var(--ft-primary-400);
  transform: scale(1.15) rotate(-12deg);
}

.filter-input__field :deep(.p-inputtext) {
  flex: 1;

  padding: 0;

  font-size: var(--ft-text-base);
  color: var(--ft-text-primary);

  background: transparent;
  border: none;
  box-shadow: none;
}

.filter-input__field :deep(.p-inputtext):focus {
  outline: none;
  box-shadow: none;
}

.filter-input__field :deep(.p-inputtext)::placeholder {
  color: var(--ft-text-tertiary);
}

/* Premium Select & DatePicker */
.filter-select :deep(.p-select),
.filter-datepicker :deep(.p-datepicker-input) {
  background: color-mix(in srgb, var(--ft-surface-base) 85%, transparent);
  border-color: color-mix(in srgb, var(--ft-border-default) 60%, transparent);
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);

  backdrop-filter: blur(8px);

  transition:
    all var(--ft-transition-fast),
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-select :deep(.p-select:hover),
.filter-datepicker :deep(.p-datepicker-input:hover) {
  background: color-mix(in srgb, var(--ft-surface-base) 95%, transparent);
  border-color: color-mix(in srgb, var(--ft-border-strong) 80%, transparent);
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
  transform: translateY(-2px);
}

.filter-select :deep(.p-select:focus),
.filter-select :deep(.p-select.p-focus),
.filter-datepicker :deep(.p-datepicker-input:focus),
.filter-datepicker :deep(.p-datepicker-input.p-focus) {
  background: var(--ft-surface-base);
  border-color: var(--ft-primary-500);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--ft-primary-500) 15%, transparent),
    0 6px 16px rgb(0 0 0 / 20%);
  outline: none;
  transform: translateY(-2px);
}

/* Premium Clear Button */
.filter-clear-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  width: 44px;
  height: 44px;
  padding: 0;

  font-size: 1.25rem;
  color: var(--ft-text-tertiary);

  cursor: pointer;
  background: color-mix(in srgb, var(--ft-surface-base) 85%, transparent);
  border: 1px solid color-mix(in srgb, var(--ft-border-default) 60%, transparent);
  border-radius: var(--ft-radius-lg);
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);

  backdrop-filter: blur(8px);

  transition:
    all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-clear-btn:hover {
  color: var(--ft-danger-400);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-danger-500) 18%, transparent),
    color-mix(in srgb, var(--ft-danger-600) 12%, transparent)
  );
  border-color: color-mix(in srgb, var(--ft-danger-500) 35%, transparent);
  box-shadow:
    0 4px 12px color-mix(in srgb, var(--ft-danger-500) 25%, transparent),
    0 0 0 4px color-mix(in srgb, var(--ft-danger-500) 10%, transparent);
  transform: translateY(-2px) scale(1.05);
}

.filter-clear-btn:active {
  transform: translateY(0) scale(0.95);
}

.filter-clear-btn:focus-visible {
  outline: 2px solid var(--ft-danger-400);
  outline-offset: 2px;
}

.filter-clear-btn i {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-clear-btn:hover i {
  transform: rotate(90deg) scale(1.2);
  filter: drop-shadow(0 0 4px var(--ft-danger-400));
}

/* Responsive */
@media (width <= 768px) {
  .transaction-filters__controls {
    grid-template-columns: 1fr 1fr;
    gap: var(--ft-space-3);
    padding: var(--ft-space-4);
  }

  .filter-control--search {
    grid-column: 1 / -1;
    min-width: 0;
  }

  .filter-control--action {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

@media (width <= 640px) {
  .transaction-filters__controls {
    grid-template-columns: 1fr;
    gap: var(--ft-space-2);
    padding: var(--ft-space-3);
  }

  .filter-control--action {
    justify-content: center;
  }

  .filter-clear-btn {
    width: 100%;
  }
}

/* Light mode overrides */
.light-mode .transaction-filters__controls {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-50) 80%, transparent),
    color-mix(in srgb, var(--ft-primary-100) 60%, transparent)
  );
  border-color: color-mix(in srgb, var(--ft-primary-200) 50%, transparent);
  box-shadow:
    0 4px 16px rgb(0 0 0 / 8%),
    inset 0 1px 0 rgb(255 255 255 / 40%);
}
</style>
