<script setup lang="ts">
import { computed } from 'vue'
import type { AccountType } from '../types'
import { getAccountTypeInfo } from '../utils/accountHelpers'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

const props = defineProps<{
  searchText: string
  selectedType: AccountType | null
}>()

const emit = defineEmits<{
  'update:searchText': [value: string]
  'update:selectedType': [value: AccountType | null]
  clearFilters: []
}>()

// Account type filter options
const accountTypeOptions = computed(() => [
  { label: 'Все типы', value: null },
  { label: getAccountTypeInfo(0).label, value: 0, icon: getAccountTypeInfo(0).icon },
  { label: getAccountTypeInfo(1).label, value: 1, icon: getAccountTypeInfo(1).icon },
  { label: getAccountTypeInfo(2).label, value: 2, icon: getAccountTypeInfo(2).icon },
])

const hasActiveFilters = computed(() => {
  return props.searchText.length > 0 || props.selectedType !== null
})
</script>

<template>
  <div class="account-filters ft-card ft-card--muted">
    <div class="filters-grid">
      <!-- Search -->
      <FormField class="filter-field filter-field--wide" label="Поиск">
        <template #default="{ fieldAttrs }">
          <InputText
            v-bind="fieldAttrs"
            :model-value="props.searchText"
            @update:model-value="val => emit('update:searchText', val)"
            placeholder="Название счёта..."
            class="w-full"
            autocomplete="off"
          >
            <template #prefix>
              <i class="pi pi-search" />
            </template>
          </InputText>
        </template>
      </FormField>

      <!-- Type filter -->
      <FormField class="filter-field" label="Тип счёта">
        <template #default="{ fieldAttrs }">
          <Select
            :model-value="props.selectedType"
            @update:model-value="val => emit('update:selectedType', val)"
            :options="accountTypeOptions"
            option-label="label"
            option-value="value"
            placeholder="Все типы"
            class="w-full"
            :input-id="fieldAttrs.id"
            :aria-describedby="fieldAttrs['aria-describedby']"
            :aria-invalid="fieldAttrs['aria-invalid']"
          >
            <template #value="slotProps">
              <div v-if="slotProps.value !== null && slotProps.value !== undefined" class="filter-option">
                <i :class="`pi ${getAccountTypeInfo(slotProps.value).icon}`" />
                <span>{{ getAccountTypeInfo(slotProps.value).label }}</span>
              </div>
              <span v-else>Все типы</span>
            </template>
            <template #option="slotProps">
              <div class="filter-option">
                <i v-if="slotProps.option.icon" :class="`pi ${slotProps.option.icon}`" />
                <span>{{ slotProps.option.label }}</span>
              </div>
            </template>
          </Select>
        </template>
      </FormField>

      <!-- Clear button -->
      <FormField class="filter-field filter-field--compact" label="Сбросить" label-sr-only>
        <template #default>
          <AppButton
            icon="pi pi-filter-slash"
            variant="ghost"
            block
            :disabled="!hasActiveFilters"
            @click="emit('clearFilters')"
          >
            Сбросить
          </AppButton>
        </template>
      </FormField>
    </div>

    <!-- Active filters info -->
    <div v-if="hasActiveFilters" class="active-filters">
      <span class="active-filters__label">
        <i class="pi pi-filter-fill" aria-hidden="true" />
        Активные фильтры:
      </span>
      <div class="active-filters__tags">
        <Tag
          v-if="searchText"
          :value="`Поиск: ${searchText}`"
          severity="info"
          @click="emit('update:searchText', '')"
        >
          <template #default>
            {{ `Поиск: ${searchText}` }}
            <i class="pi pi-times ml-2" style="cursor: pointer;" />
          </template>
        </Tag>
        <Tag
          v-if="selectedType !== null"
          :value="getAccountTypeInfo(selectedType).label"
          severity="info"
          @click="emit('update:selectedType', null)"
        >
          <template #default>
            {{ getAccountTypeInfo(selectedType).label }}
            <i class="pi pi-times ml-2" style="cursor: pointer;" />
          </template>
        </Tag>
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

.filter-field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.filter-option {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.filter-option i {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.active-filters {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  padding-top: var(--ft-space-3);
  border-top: 1px solid var(--ft-border-soft);
}

.active-filters__label {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
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

@media (max-width: 768px) {
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
