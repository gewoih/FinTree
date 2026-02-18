<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Paginator from 'primevue/paginator';
import type { PageState } from 'primevue/paginator';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
import { mergePt } from './prime/pt';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    first?: number;
    rows?: number;
    totalRecords?: number;
    rowsPerPageOptions?: number[];
    template?: string;
    unstyled?: boolean;
    pt?: Record<string, unknown>;
  }>(),
  {
    first: 0,
    rows: 10,
    totalRecords: 0,
    rowsPerPageOptions: () => [],
    template: undefined,
    unstyled: undefined,
    pt: undefined,
  }
);

const emit = defineEmits<{
  (event: 'page', value: PageState): void;
  (event: 'update:first', value: number): void;
  (event: 'update:rows', value: number): void;
}>();

const attrs = useAttrs();
const isUnstyled = computed(() => resolvePrimeUnstyled('uiPaginator', props.unstyled));

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-paginator__root' },
      content: { class: 'ui-paginator__content' },
      pages: { class: 'ui-paginator__pages' },
      page: { class: 'ui-paginator__page-button' },
      first: { class: 'ui-paginator__nav ui-paginator__nav--first' },
      prev: { class: 'ui-paginator__nav ui-paginator__nav--prev' },
      next: { class: 'ui-paginator__nav ui-paginator__nav--next' },
      last: { class: 'ui-paginator__nav ui-paginator__nav--last' },
      current: { class: 'ui-paginator__current' },
      pcRowPerPageDropdown: { class: 'ui-paginator__rows' },
    } as Record<string, unknown>,
    props.pt
  )
);
</script>

<template>
  <Paginator
    v-bind="attrs"
    class="ui-paginator"
    :first="props.first"
    :rows="props.rows"
    :total-records="props.totalRecords"
    :rows-per-page-options="props.rowsPerPageOptions"
    :template="props.template"
    :unstyled="isUnstyled"
    :pt="mergedPt"
    @page="event => emit('page', event)"
    @update:first="value => emit('update:first', value)"
    @update:rows="value => emit('update:rows', value)"
  />
</template>
