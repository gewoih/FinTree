<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Paginator from 'primevue/paginator';
import type { PageState, PaginatorPassThroughOptions } from 'primevue/paginator';
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
    pt?: PaginatorPassThroughOptions;
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
      pcRowPerPageDropdown: { root: { class: 'ui-paginator__rows' } },
    } as PaginatorPassThroughOptions,
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
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
    @page="event => emit('page', event)"
    @update:first="value => emit('update:first', value)"
    @update:rows="value => emit('update:rows', value)"
  />
</template>

<style scoped>
/*
 * NOTE: .ui-paginator__root lands on the same DOM element as .ui-paginator via
 * PT + Vue fallthrough. Root-level layout and visual styles live on .ui-paginator.
 */
.ui-paginator {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: center;

  padding: var(--ft-space-2) var(--ft-space-3);

  color: var(--ft-text-primary);

  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--ft-surface-overlay) 92%, transparent) 0%,
    var(--ft-surface-raised) 100%
  );
  border: 1px solid color-mix(in srgb, var(--ft-border-default) 88%, var(--ft-border-strong));
  border-radius: var(--ft-radius-lg);
  box-shadow:
    0 18px 32px color-mix(in srgb, var(--ft-bg-base) 60%, transparent),
    0 2px 8px color-mix(in srgb, var(--ft-bg-base) 32%, transparent);
}

.ui-paginator :deep(.ui-paginator__content) {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-1);
  align-items: center;
  justify-content: center;
}

.ui-paginator :deep(.ui-paginator__pages) {
  display: inline-flex;
  gap: var(--ft-space-1);
  align-items: center;
}

.ui-paginator :deep(.ui-paginator__nav),
.ui-paginator :deep(.ui-paginator__page-button) {
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-width: var(--ft-control-height);
  height: var(--ft-control-height);
  padding: 0 var(--ft-space-2);

  color: var(--ft-text-secondary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);

  transition:
    border-color var(--ft-transition-fast),
    color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

.ui-paginator :deep(.ui-paginator__nav:hover),
.ui-paginator :deep(.ui-paginator__page-button:hover) {
  color: var(--ft-text-primary);
  background: var(--ft-surface-overlay);
  border-color: var(--ft-border-strong);
}

.ui-paginator :deep(.ui-paginator__page-button[data-p-selected='true']) {
  color: var(--ft-text-inverse);
  background: var(--ft-primary-400);
  border-color: var(--ft-primary-400);
}

.ui-paginator :deep(.ui-paginator__current) {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.ui-paginator :deep(.ui-paginator__rows) {
  min-width: 5.25rem;
  margin-inline-start: var(--ft-space-1);
}

.ui-paginator :deep([data-p-disabled='true']),
.ui-paginator :deep([data-p-disabled='true']:hover) {
  cursor: not-allowed;

  color: var(--ft-text-disabled);

  opacity: 0.7;
  background: var(--ft-surface-base);
  border-color: var(--ft-border-soft);
}
</style>
