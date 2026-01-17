<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import DataTable from 'primevue/datatable'

const props = withDefaults(
  defineProps<{
    value?: unknown[]
    loading?: boolean
    stripedRows?: boolean
    paginator?: boolean
    rows?: number
    rowsPerPageOptions?: number[]
    responsiveLayout?: 'scroll' | 'stack'
    stickyHeader?: boolean
    emptyMessage?: string
  }>(),
  {
    value: () => [],
    stripedRows: true,
    responsiveLayout: 'scroll',
    stickyHeader: true,
    emptyMessage: 'Нет данных'
  }
)

const attrs = useAttrs()

const tableClass = computed(() => [
  'ui-datatable',
  { 'ui-datatable--sticky': props.stickyHeader }
])
</script>

<template>
  <DataTable
    v-bind="attrs"
    :value="props.value"
    :loading="props.loading"
    :stripedRows="props.stripedRows"
    :paginator="props.paginator"
    :rows="props.rows"
    :rowsPerPageOptions="props.rowsPerPageOptions"
    :responsiveLayout="props.responsiveLayout"
    :emptyMessage="props.emptyMessage"
    :class="tableClass"
  >
    <slot />
  </DataTable>
</template>

<style scoped>
.ui-datatable :deep(.p-datatable-thead > tr > th) {
  padding: var(--space-3) var(--space-4);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ui-datatable :deep(.p-datatable-tbody > tr > td) {
  padding: var(--space-3) var(--space-4);
}

.ui-datatable--sticky :deep(.p-datatable-thead > tr > th) {
  position: sticky;
  top: 0;
  z-index: 1;
}

.ui-datatable :deep(.p-datatable-tbody > tr:hover) {
  background: rgba(59, 130, 246, 0.12);
}
</style>
