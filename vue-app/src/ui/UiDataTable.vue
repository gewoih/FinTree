<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import DataTable from 'primevue/datatable';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const tableClasses = computed(() => [
  'ui-datatable',
]);
</script>

<template>
  <div class="ui-datatable__shell">
    <DataTable v-bind="attrs" :class="tableClasses">
      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>
      <template v-if="$slots.empty" #empty>
        <slot name="empty" />
      </template>
      <template v-if="$slots.loading" #loading>
        <slot name="loading" />
      </template>
      <slot />
    </DataTable>
  </div>
</template>

<style scoped>
.ui-datatable__shell {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface-2);
  overflow: hidden;
}

.ui-datatable :deep(.p-datatable-table) {
  min-width: 760px;
}

.ui-datatable :deep(.p-datatable-thead > tr > th) {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: var(--ft-text-xs);
}

.ui-datatable :deep(.p-datatable-tbody > tr > td) {
  padding: var(--space-3);
}

.ui-datatable :deep(.p-paginator-bottom) {
  border-top: 1px solid var(--border);
  padding: var(--space-3);
}
</style>
