<script setup lang="ts">
import { computed } from 'vue'
import type { AccountType } from '../types'
import { getAccountTypeInfo } from '../utils/accountHelpers'
import UiInputText from '../ui/UiInputText.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiButton from '../ui/UiButton.vue'

const props = defineProps<{
  searchText: string
  selectedType: AccountType | null
  availableTypes?: AccountType[]
}>()

const emit = defineEmits<{
  'update:searchText': [value: string]
  'update:selectedType': [value: AccountType | null]
  clearFilters: []
}>()

// Account type filter options
const resolvedTypes = computed<AccountType[]>(() =>
  props.availableTypes?.length ? props.availableTypes : [0, 3, 2, 4]
)

const accountTypeOptions = computed<Array<{ label: string; value: AccountType | null; icon?: string }>>(() => [
  { label: 'Все типы', value: null },
  ...resolvedTypes.value.map(type => ({
    label: getAccountTypeInfo(type).label,
    value: type,
    icon: getAccountTypeInfo(type).icon
  }))
])

const showTypeFilter = computed(() => resolvedTypes.value.length > 1)

const hasActiveFilters = computed(() => {
  return props.searchText.length > 0 || props.selectedType !== null
})

const handleSearchUpdate = (value: string | null | undefined) => {
  emit('update:searchText', value ?? '')
}

const handleTypeUpdate = (value: unknown) => {
  emit('update:selectedType', (value as AccountType | null) ?? null)
}
</script>

<template>
  <div class="account-filters">
    <div
      class="account-filters__controls"
      :class="{ 'account-filters__controls--compact': !showTypeFilter }"
    >
      <!-- Search -->
      <div class="filter-control">
        <label
          for="account-search"
          class="filter-control__label"
        >
          Поиск
        </label>
        <div class="filter-input">
          <i
            class="pi pi-search filter-input__icon"
            aria-hidden="true"
          />
          <UiInputText
            id="account-search"
            :model-value="props.searchText"
            placeholder="Название счёта..."
            autocomplete="off"
            class="filter-input__field"
            @update:model-value="handleSearchUpdate"
          />
        </div>
      </div>

      <!-- Type filter -->
      <div
        v-if="showTypeFilter"
        class="filter-control"
      >
        <label
          for="account-type"
          class="filter-control__label"
        >
          Тип счёта
        </label>
        <UiSelect
          id="account-type"
          :model-value="props.selectedType"
          :options="accountTypeOptions"
          option-label="label"
          option-value="value"
          placeholder="Все типы"
          class="filter-select"
          @update:model-value="handleTypeUpdate"
        >
          <template #value="slotProps">
            <div
              v-if="slotProps.value !== null && slotProps.value !== undefined"
              class="filter-option"
            >
              <i :class="`pi ${getAccountTypeInfo(slotProps.value).icon} filter-option__icon`" />
              <span>{{ getAccountTypeInfo(slotProps.value).label }}</span>
            </div>
            <span v-else>Все типы</span>
          </template>
          <template #option="slotProps">
            <div class="filter-option">
              <i
                v-if="slotProps.option.icon"
                :class="`pi ${slotProps.option.icon} filter-option__icon`"
              />
              <span>{{ slotProps.option.label }}</span>
            </div>
          </template>
        </UiSelect>
      </div>

      <!-- Clear button -->
      <div class="filter-control filter-control--action">
        <span class="filter-control__label sr-only">Сбросить фильтры</span>
        <UiButton
          icon="pi pi-filter-slash"
          variant="ghost"
          block
          :disabled="!hasActiveFilters"
          aria-label="Сбросить фильтры"
          @click="emit('clearFilters')"
        >
          Сбросить
        </UiButton>
      </div>
    </div>

    <!-- Active filters -->
    <div
      v-if="hasActiveFilters"
      class="account-filters__active"
    >
      <div class="active-filters-label">
        <i
          class="pi pi-filter-fill"
          aria-hidden="true"
        />
        <span>Активные фильтры:</span>
      </div>
      <div class="active-filters-chips">
        <button
          v-if="searchText"
          type="button"
          class="filter-chip"
          aria-label="Удалить фильтр поиска"
          @click="emit('update:searchText', '')"
        >
          <span class="filter-chip__text">{{ `Поиск: ${searchText}` }}</span>
          <i class="pi pi-times filter-chip__icon" />
        </button>
        <button
          v-if="selectedType !== null"
          type="button"
          class="filter-chip"
          :aria-label="`Удалить фильтр ${getAccountTypeInfo(selectedType).label}`"
          @click="emit('update:selectedType', null)"
        >
          <span class="filter-chip__text">{{ getAccountTypeInfo(selectedType).label }}</span>
          <i class="pi pi-times filter-chip__icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-filters {
  width: 100%;
}

.account-filters__controls {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: var(--ft-space-4);
  align-items: end;

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

.account-filters__controls--compact {
  grid-template-columns: 2fr auto;
}

.filter-control {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.filter-control--action {
  padding-top: calc(var(--ft-text-sm) * var(--ft-leading-normal) + var(--ft-space-2));
}

.filter-control__label {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
  letter-spacing: -0.01em;
  text-shadow: 0 1px 2px rgb(0 0 0 / 20%);
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

/* Premium Select */
.filter-select :deep(.p-select) {
  background: color-mix(in srgb, var(--ft-surface-base) 85%, transparent);
  border-color: color-mix(in srgb, var(--ft-border-default) 60%, transparent);
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);

  backdrop-filter: blur(8px);

  transition:
    all var(--ft-transition-fast),
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-select :deep(.p-select:hover) {
  background: color-mix(in srgb, var(--ft-surface-base) 95%, transparent);
  border-color: color-mix(in srgb, var(--ft-border-strong) 80%, transparent);
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
  transform: translateY(-2px);
}

.filter-select :deep(.p-select:focus),
.filter-select :deep(.p-select.p-focus) {
  background: var(--ft-surface-base);
  border-color: var(--ft-primary-500);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--ft-primary-500) 15%, transparent),
    0 6px 16px rgb(0 0 0 / 20%);
  outline: none;
  transform: translateY(-2px);
}

.filter-option {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  transition: all var(--ft-transition-fast);
}

.filter-option__icon {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);

  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-option:hover .filter-option__icon {
  transform: scale(1.2);
}

/* Active Filters */
.account-filters__active {
  display: flex;
  gap: var(--ft-space-4);
  align-items: center;

  margin-top: var(--ft-space-4);
  padding: var(--ft-space-4) var(--ft-space-5);

  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-950) 30%, transparent),
    color-mix(in srgb, var(--ft-primary-900) 20%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--ft-primary-400) 8%, transparent);
  border-radius: var(--ft-radius-lg);
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);

  backdrop-filter: blur(8px);
}

.active-filters-label {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
  white-space: nowrap;
}

.active-filters-label i {
  font-size: 1rem;
  color: var(--ft-primary-400);

  animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
    filter: drop-shadow(0 0 4px var(--ft-primary-400));
  }
  50% {
    opacity: 0.7;
    filter: drop-shadow(0 0 8px var(--ft-primary-300));
  }
}

.active-filters-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
}

/* Premium Filter Chips */
.filter-chip {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  padding: var(--ft-space-2) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);

  cursor: pointer;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-500) 22%, transparent),
    color-mix(in srgb, var(--ft-primary-600) 16%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--ft-primary-400) 30%, transparent);
  border-radius: var(--ft-radius-full);
  box-shadow:
    0 2px 6px rgb(0 0 0 / 15%),
    inset 0 1px 0 color-mix(in srgb, var(--ft-primary-300) 15%, transparent);

  backdrop-filter: blur(4px);

  transition:
    all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-chip:hover {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-500) 30%, transparent),
    color-mix(in srgb, var(--ft-primary-600) 24%, transparent)
  );
  border-color: color-mix(in srgb, var(--ft-primary-400) 45%, transparent);
  box-shadow:
    0 4px 12px color-mix(in srgb, var(--ft-primary-500) 25%, transparent),
    0 0 0 4px color-mix(in srgb, var(--ft-primary-500) 12%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--ft-primary-300) 20%, transparent);
  transform: translateY(-2px) scale(1.02);
}

.filter-chip:active {
  transform: translateY(0) scale(0.98);
}

.filter-chip:focus-visible {
  outline: 2px solid var(--ft-primary-400);
  outline-offset: 2px;
}

.filter-chip__text {
  letter-spacing: -0.01em;
}

.filter-chip__icon {
  font-size: 0.875rem;
  color: var(--ft-text-secondary);

  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-chip:hover .filter-chip__icon {
  color: var(--ft-text-primary);
  transform: rotate(90deg) scale(1.2);
}

/* Responsive */
@media (width <= 768px) {
  .account-filters__controls {
    grid-template-columns: 1fr;
    gap: var(--ft-space-3);
    padding: var(--ft-space-4);
  }

  .account-filters__controls--compact {
    grid-template-columns: 1fr;
  }

  .filter-control--action {
    padding-top: 0;
  }

  .account-filters__active {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ft-space-3);
    padding: var(--ft-space-4);
  }
}

@media (width <= 640px) {
  .account-filters__controls {
    padding: var(--ft-space-3);
  }

  .active-filters-label {
    font-size: var(--ft-text-xs);
  }

  .filter-chip {
    font-size: var(--ft-text-xs);
    padding: var(--ft-space-1) var(--ft-space-2);
  }
}

/* Light mode overrides */
.light-mode .account-filters__controls {
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

.light-mode .account-filters__active {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-50) 60%, transparent),
    color-mix(in srgb, var(--ft-primary-100) 40%, transparent)
  );
  border-color: color-mix(in srgb, var(--ft-primary-200) 40%, transparent);
}
</style>
