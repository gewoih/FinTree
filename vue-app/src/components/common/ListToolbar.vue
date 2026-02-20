<script setup lang="ts">
import UiInputText from '../../ui/UiInputText.vue'

defineProps<{
  modelValue: 'active' | 'archived'
  searchText: string
  activeCount: number
  archivedCount: number
  searchPlaceholder?: string
  showSearch?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: 'active' | 'archived']
  'update:searchText': [value: string]
}>()

const handleSearchUpdate = (value: string | null | undefined) => {
  emit('update:searchText', value ?? '')
}
</script>

<template>
  <div class="list-toolbar">
    <div
      class="list-toolbar__tabs"
      role="tablist"
      aria-label="Фильтр по статусу"
    >
      <button
        class="list-toolbar__tab"
        :class="{ 'is-active': modelValue === 'active' }"
        type="button"
        role="tab"
        :aria-selected="modelValue === 'active'"
        @click="emit('update:modelValue', 'active')"
      >
        <span>Активные</span>
        <strong>{{ activeCount }}</strong>
      </button>
      <button
        class="list-toolbar__tab"
        :class="{ 'is-active': modelValue === 'archived' }"
        type="button"
        role="tab"
        :aria-selected="modelValue === 'archived'"
        @click="emit('update:modelValue', 'archived')"
      >
        <span>Архив</span>
        <strong>{{ archivedCount }}</strong>
      </button>
    </div>

    <div
      v-if="showSearch !== false"
      class="list-toolbar__search"
    >
      <i
        class="pi pi-search"
        aria-hidden="true"
      />
      <UiInputText
        :model-value="searchText"
        :placeholder="searchPlaceholder ?? 'Поиск...'"
        autocomplete="off"
        aria-label="Поиск"
        @update:model-value="handleSearchUpdate"
      />
    </div>
  </div>
</template>

<style scoped>
.list-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
  align-items: center;
}

.list-toolbar__tabs {
  display: inline-flex;
  flex-shrink: 0;
  gap: var(--ft-space-2);

  padding: var(--ft-space-1);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);
}

.list-toolbar__tab {
  cursor: pointer;

  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-3);

  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);

  background: transparent;
  border: none;
  border-radius: var(--ft-radius-md);
}

.list-toolbar__tab strong {
  font-size: var(--ft-text-sm);
}

.list-toolbar__tab.is-active {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-primary-500) 18%, transparent);
}

.list-toolbar__tab:focus-visible {
  outline: 2px solid var(--ft-primary-500);
  outline-offset: 1px;
}

.list-toolbar__search {
  display: flex;
  flex: 1;
  gap: var(--ft-space-2);
  align-items: center;

  min-width: 200px;
  min-height: 36px;
  padding: 0 var(--ft-space-2);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);

  transition:
    border-color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.list-toolbar__search:focus-within {
  border-color: var(--ft-border-strong);
  box-shadow:
    0 0 0 3px var(--ft-focus-ring),
    var(--ft-shadow-xs);
}

.list-toolbar__search i {
  flex-shrink: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
}

.list-toolbar__search :deep(.p-inputtext) {
  flex: 1;

  width: 100%;
  padding: 0;

  background: transparent;
  border: none;
  box-shadow: none !important;
}

.list-toolbar__search :deep(.p-inputtext:focus) {
  border: none !important;
  outline: none;
  box-shadow: none !important;
}

@media (width <= 640px) {
  .list-toolbar__tabs {
    justify-content: space-between;
    width: 100%;
  }

  .list-toolbar__tab {
    flex: 1;
    justify-content: center;
  }

  .list-toolbar__search {
    flex: none;
    width: 100%;
  }
}
</style>
