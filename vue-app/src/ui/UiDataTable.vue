<script setup lang="ts">
import type { CSSProperties } from 'vue'
import DataTable from 'primevue/datatable'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    value: unknown[]
    dataKey?: string
    scrollable?: boolean
    scrollHeight?: string
    tableStyle?: string | CSSProperties
    variant?: 'default' | 'readable'
  }>(),
  {
    dataKey: 'key',
    scrollable: false,
    scrollHeight: undefined,
    tableStyle: undefined,
    variant: 'default',
  }
)
</script>

<template>
  <DataTable
    v-bind="$attrs"
    :value="props.value"
    :data-key="props.dataKey"
    :scrollable="props.scrollable"
    :scroll-height="props.scrollHeight"
    :table-style="props.tableStyle"
    class="ui-data-table"
    :class="`ui-data-table--${props.variant}`"
  >
    <slot />
  </DataTable>
</template>

<style scoped>
/* stylelint-disable selector-pseudo-class-no-unknown */
.ui-data-table {
  overflow: hidden;
  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-md);
}

.ui-data-table :deep(.p-datatable-table-container) {
  border-radius: inherit;
}

.ui-data-table :deep(.p-datatable-table) {
  border-collapse: collapse;
  min-width: 100%;
}

.ui-data-table :deep(.p-datatable-thead > tr > th) {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
  background: var(--ft-surface-overlay);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.ui-data-table :deep(.p-datatable-tbody > tr > td) {
  color: var(--ft-text-primary);
  background: var(--ft-surface-base);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.ui-data-table :deep(.p-datatable-frozen-column) {
  background: var(--ft-surface-base);
}

.ui-data-table :deep(.p-datatable-thead > tr > th.p-datatable-frozen-column) {
  background: var(--ft-surface-overlay);
}

.ui-data-table--default :deep(.p-datatable-thead > tr > th) {
  padding: var(--ft-space-2) var(--ft-space-3);
  font-size: var(--ft-text-xs);
}

.ui-data-table--default :deep(.p-datatable-tbody > tr > td) {
  padding: var(--ft-space-2) var(--ft-space-3);
  font-size: var(--ft-text-sm);
}

.ui-data-table--readable :deep(.p-datatable-thead > tr > th) {
  padding: var(--ft-space-3) var(--ft-space-4);
  font-size: var(--ft-text-sm);
}

.ui-data-table--readable :deep(.p-datatable-tbody > tr > td) {
  padding: var(--ft-space-3) var(--ft-space-4);
  font-size: var(--ft-text-base);
}

.ui-data-table :deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: none;
}

/* stylelint-enable selector-pseudo-class-no-unknown */
</style>
