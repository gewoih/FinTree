<script setup lang="ts">
import DataTable from 'primevue/datatable';

withDefaults(
  defineProps<{
    value: unknown[];
    loading?: boolean;
    paginator?: boolean;
    rows?: number;
    rowsPerPageOptions?: number[];
    paginatorTemplate?: string;
    currentPageReportTemplate?: string;
    responsiveLayout?: 'scroll' | 'stack';
    scrollable?: boolean;
    scrollHeight?: string;
  }>(),
  {
    paginator: false,
    rows: 10,
    responsiveLayout: 'scroll',
    scrollable: false
  }
);
</script>

<template>
  <DataTable
    :value="value"
    :loading="loading"
    :paginator="paginator"
    :rows="rows"
    :rowsPerPageOptions="rowsPerPageOptions"
    :paginatorTemplate="paginatorTemplate"
    :currentPageReportTemplate="currentPageReportTemplate"
    :responsiveLayout="responsiveLayout"
    :scrollable="scrollable"
    :scrollHeight="scrollHeight"
    class="ui-datatable"
    v-bind="$attrs"
  >
    <slot />
  </DataTable>
</template>

<style scoped>
.ui-datatable {
  width: 100%;
}
</style>
