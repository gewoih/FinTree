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
    <DataTable
      v-bind="attrs"
      :class="tableClasses"
    >
      <template
        v-if="$slots.header"
        #header
      >
        <slot name="header" />
      </template>
      <template
        v-if="$slots.empty"
        #empty
      >
        <slot name="empty" />
      </template>
      <template
        v-if="$slots.loading"
        #loading
      >
        <slot name="loading" />
      </template>
      <template
        v-if="$slots.footer"
        #footer
      >
        <slot name="footer" />
      </template>
      <template
        v-if="$slots.groupheader"
        #groupheader="slotProps"
      >
        <slot
          name="groupheader"
          v-bind="slotProps"
        />
      </template>
      <template
        v-if="$slots.groupfooter"
        #groupfooter="slotProps"
      >
        <slot
          name="groupfooter"
          v-bind="slotProps"
        />
      </template>
      <slot />
    </DataTable>
  </div>
</template>

<style scoped>
.ui-datatable__shell {
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.ui-datatable :deep(.p-datatable-table) {
  min-width: 760px;
}

.ui-datatable :deep(.p-datatable-thead > tr > th) {
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ui-datatable :deep(.p-datatable-tbody > tr > td) {
  padding: var(--space-3);
}

.ui-datatable :deep(.p-paginator-bottom) {
  padding: var(--space-3);
  border-top: 1px solid var(--border);
}

@media (width <= 768px) {
  .ui-datatable :deep(.p-datatable-table) {
    min-width: 100%;
  }
}
</style>
