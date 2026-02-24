<script setup lang="ts">
import InputText from 'primevue/inputtext'

defineProps<{
  modelValue: 'active' | 'archived'
  searchText: string
  activeCount: number
  archivedCount: number
  searchPlaceholder?: string
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

    <div class="list-toolbar__search ft-input-shell">
      <i
        class="pi pi-search"
        aria-hidden="true"
      />
      <InputText
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
  --ft-input-shell-min-height: 36px;
  --ft-input-shell-padding-x: var(--ft-space-1);
  --ft-input-shell-padding-y: var(--ft-space-1);

  flex: 1;
  min-width: 200px;
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
