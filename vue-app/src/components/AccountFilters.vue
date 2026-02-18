<script setup lang="ts">
import { computed } from 'vue'
import type { AccountType } from '../types'
import { getAccountTypeInfo } from '../utils/accountHelpers'
import UiInputText from '../ui/UiInputText.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiButton from '../ui/UiButton.vue'
import UiBadge from '../ui/UiBadge.vue'
import FormField from './common/FormField.vue'

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
      class="filters-grid"
      :class="{ 'filters-grid--compact': !showTypeFilter }"
    >
      <!-- Search -->
      <FormField
        class="filter-field filter-field--wide"
        label="Поиск"
      >
        <template #default="{ fieldAttrs }">
          <div class="filter-input">
            <i
              class="pi pi-search"
              aria-hidden="true"
            />
            <UiInputText
              :id="fieldAttrs.id"
              :model-value="props.searchText"
              placeholder="Название счёта..."
              autocomplete="off"
              @update:model-value="handleSearchUpdate"
            />
          </div>
        </template>
      </FormField>

      <!-- Type filter -->
      <FormField
        v-if="showTypeFilter"
        class="filter-field"
        label="Тип счёта"
      >
        <template #default="{ fieldAttrs }">
          <UiSelect
            :model-value="props.selectedType"
            :options="accountTypeOptions"
            option-label="label"
            option-value="value"
            placeholder="Все типы"
            :input-id="fieldAttrs.id"
            @update:model-value="handleTypeUpdate"
          >
            <template #value="slotProps">
              <div
                v-if="slotProps.value !== null && slotProps.value !== undefined"
                class="filter-option"
              >
                <i :class="`pi ${getAccountTypeInfo(slotProps.value).icon}`" />
                <span>{{ getAccountTypeInfo(slotProps.value).label }}</span>
              </div>
              <span v-else>Все типы</span>
            </template>
            <template #option="slotProps">
              <div class="filter-option">
                <i
                  v-if="slotProps.option.icon"
                  :class="`pi ${slotProps.option.icon}`"
                />
                <span>{{ slotProps.option.label }}</span>
              </div>
            </template>
          </UiSelect>
        </template>
      </FormField>

      <!-- Clear button -->
      <FormField
        class="filter-field filter-field--compact"
        label="Сбросить"
        label-sr-only
      >
        <template #default>
          <UiButton
            icon="pi pi-filter-slash"
            variant="ghost"
            block
            :disabled="!hasActiveFilters"
            @click="emit('clearFilters')"
          >
            Сбросить
          </UiButton>
        </template>
      </FormField>
    </div>

    <!-- Active filters info -->
    <div
      v-if="hasActiveFilters"
      class="active-filters"
    >
      <span class="active-filters__label">
        <i
          class="pi pi-filter-fill"
          aria-hidden="true"
        />
        Активные фильтры:
      </span>
      <div class="active-filters__tags">
        <UiBadge
          v-if="searchText"
          class="active-filters__tag"
          severity="info"
          @click="emit('update:searchText', '')"
        >
          <template #default>
            {{ `Поиск: ${searchText}` }}
            <i class="pi pi-times active-filters__tag-icon" />
          </template>
        </UiBadge>
        <UiBadge
          v-if="selectedType !== null"
          class="active-filters__tag"
          severity="info"
          @click="emit('update:selectedType', null)"
        >
          <template #default>
            {{ getAccountTypeInfo(selectedType).label }}
            <i class="pi pi-times active-filters__tag-icon" />
          </template>
        </UiBadge>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-filters {
  gap: var(--ft-space-4);
}

.filters-grid {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: var(--ft-space-3);
  align-items: end;
}

.filters-grid--compact {
  grid-template-columns: 2fr auto;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.filter-input {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  padding: var(--ft-space-2) var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);

  transition:
    border-color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.filter-input:focus-within {
  border-color: var(--ft-border-strong);
  box-shadow:
    0 0 0 3px var(--ft-focus-ring),
    0 1px 3px rgb(0 0 0 / 12%);
}

.filter-input i {
  color: var(--ft-text-secondary);
}

.filter-input :deep(.ui-input) {
  flex: 1;

  padding: 0;

  background: transparent;
  border: none;
  box-shadow: none !important;
}

.filter-input :deep(.ui-input:focus),
.filter-input :deep(.ui-input:focus-visible) {
  border: none !important;
  box-shadow: none !important;
  outline: none;
}

.filter-option {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.filter-option i {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.active-filters {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  padding-top: var(--ft-space-3);

  border-top: 1px solid var(--ft-border-soft);
}

.active-filters__label {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
  white-space: nowrap;
}

.active-filters__label i {
  color: var(--ft-primary-500);
}

.active-filters__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
}

.active-filters__tag {
  cursor: pointer;
}

.active-filters__tag-icon {
  margin-left: var(--ft-space-2);
}

@media (width <= 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }

  .filter-field--wide {
    grid-column: span 1;
  }

  .active-filters {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
