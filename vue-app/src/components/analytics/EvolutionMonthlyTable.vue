<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import {
  EVOLUTION_KPI_META,
  EVOLUTION_KPI_ORDER,
  type EvolutionDeltaTone,
  type EvolutionKpi,
  type EvolutionRange,
  type EvolutionTableCellModel,
  type EvolutionTableRowModel,
} from '@/composables/useEvolutionTab'

const props = defineProps<{
  rows: EvolutionTableRowModel[]
  selectedRange: EvolutionRange
  hasRows: boolean
}>()

const isTableExpanded = ref(true)
const showAllTableMonths = ref(false)

watch(
  () => props.selectedRange,
  range => {
    if (range !== 0) {
      showAllTableMonths.value = false
    }
  }
)

interface EvolutionTableDisplayMonth {
  key: string
  monthLabel: string
  cellsByKpi: Record<EvolutionKpi, EvolutionTableCellModel | undefined>
}

interface EvolutionTableDisplayRow {
  key: EvolutionKpi
  kpiLabel: string
  cellsByMonthKey: Record<string, EvolutionTableCellModel | undefined>
}

const displayedMonths = computed<EvolutionTableDisplayMonth[]>(() => {
  const sourceRows =
    props.selectedRange !== 0 || showAllTableMonths.value ? props.rows : props.rows.slice(0, 12)
  const orderedRows = [...sourceRows].reverse()

  return orderedRows.map(row => {
    const cellsByKpi = {} as Record<EvolutionKpi, EvolutionTableCellModel | undefined>

    for (const key of EVOLUTION_KPI_ORDER) {
      cellsByKpi[key] = row.cells.find(cell => cell.key === key)
    }

    return {
      key: row.key,
      monthLabel: row.monthLabel,
      cellsByKpi,
    }
  })
})

const displayedRows = computed<EvolutionTableDisplayRow[]>(() =>
  EVOLUTION_KPI_ORDER.map(kpi => {
    const cellsByMonthKey: Record<string, EvolutionTableCellModel | undefined> = {}

    for (const month of displayedMonths.value) {
      cellsByMonthKey[month.key] = month.cellsByKpi[kpi]
    }

    return {
      key: kpi,
      kpiLabel: EVOLUTION_KPI_META[kpi].label,
      cellsByMonthKey,
    }
  })
)

const canShowAllMonths = computed(
  () => props.selectedRange === 0 && props.rows.length > 12 && !showAllTableMonths.value
)

const hiddenMonthsCount = computed(() => props.rows.length - displayedMonths.value.length)

function deltaClass(tone: EvolutionDeltaTone | null): string {
  if (tone === 'better') return 'evolution-delta--better'
  if (tone === 'worse') return 'evolution-delta--worse'
  return 'evolution-delta--neutral'
}
</script>

<template>
  <section class="evolution-table">
    <button
      type="button"
      class="evolution-table__header"
      @click="isTableExpanded = !isTableExpanded"
    >
      <span>Детальная таблица по месяцам</span>
      <i
        class="pi"
        :class="isTableExpanded ? 'pi-chevron-up' : 'pi-chevron-down'"
        aria-hidden="true"
      />
    </button>

    <div
      v-show="isTableExpanded"
      class="evolution-table__body"
    >
      <Message
        v-if="!hasRows"
        severity="info"
        icon="pi pi-inbox"
        :closable="false"
      >
        Нет месяцев с достаточными данными для таблицы.
      </Message>

      <template v-else>
        <div class="evolution-table__scroll">
          <DataTable
            :value="displayedRows"
            data-key="key"
            scrollable
            class="evolution-table__grid"
          >
            <Column
              field="kpiLabel"
              header="Показатель"
              header-class="evolution-table__kpi-col"
              body-class="evolution-table__kpi-col"
            >
              <template #body="{ data }">
                <span class="evolution-table__kpi-text">
                  {{ data.kpiLabel }}
                </span>
              </template>
            </Column>

            <Column
              v-for="column in displayedMonths"
              :key="column.key"
              :field="column.key"
              :header="column.monthLabel"
              header-class="evolution-table__month-col"
              body-class="evolution-table__month-col"
            >
              <template #body="{ data }">
                <div class="evolution-table__cell-value">
                  {{ data.cellsByMonthKey[column.key]?.valueLabel ?? '—' }}
                </div>
                <div
                  v-if="data.cellsByMonthKey[column.key]?.deltaLabel"
                  class="evolution-table__cell-delta"
                >
                  <span
                    class="evolution-table__delta-pill"
                    :class="deltaClass(data.cellsByMonthKey[column.key]?.deltaTone ?? null)"
                  >
                    {{ data.cellsByMonthKey[column.key]?.deltaLabel }}
                  </span>
                </div>
              </template>
            </Column>
          </DataTable>
        </div>

        <button
          v-if="canShowAllMonths"
          type="button"
          class="evolution-table__show-all"
          @click="showAllTableMonths = true"
        >
          Показать все месяцы ({{ hiddenMonthsCount }})
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.evolution-table {
  display: grid;
  gap: var(--ft-space-2);
}

.evolution-table__header {
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: space-between;

  min-height: 44px;
  padding: var(--ft-space-3);

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);

  background: var(--ft-surface-soft);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

.evolution-table__body {
  display: grid;
  gap: var(--ft-space-3);
}

.evolution-table__scroll {
  overflow-x: auto;
}

.evolution-table__grid {
  min-width: 100%;
}

/* stylelint-disable selector-pseudo-class-no-unknown */
.evolution-table__grid :deep(.p-datatable-table-container) {
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-md);
}

.evolution-table__grid :deep(.p-datatable-table) {
  table-layout: fixed;
  border-spacing: 0;
  border-collapse: separate;

  width: 100%;
  min-width: 0;
}

.evolution-table__grid :deep(.p-datatable-thead > tr > th) {
  padding: var(--ft-space-3) var(--ft-space-3);

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  line-height: 1.5;
  color: var(--ft-text-secondary);
  overflow-wrap: anywhere;
  white-space: normal;

  background: var(--ft-surface-overlay);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.evolution-table__grid :deep(.p-datatable-tbody > tr > td) {
  padding: var(--ft-space-2) var(--ft-space-3);

  line-height: 1.2;
  vertical-align: top;

  background: var(--ft-surface-base);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.evolution-table__grid :deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: none;
}

.evolution-table__grid :deep(th.evolution-table__kpi-col) {
  position: sticky;
  z-index: 3;
  left: 0;

  width: 220px;
  min-width: 220px;
}

.evolution-table__grid :deep(td.evolution-table__kpi-col) {
  position: sticky;
  z-index: 2;
  left: 0;

  width: 220px;
  min-width: 220px;

  background: var(--ft-surface-base);
}

.evolution-table__grid :deep(th.evolution-table__month-col),
.evolution-table__grid :deep(td.evolution-table__month-col) {
  width: 130px;
  min-width: 130px;
}
/* stylelint-enable selector-pseudo-class-no-unknown */

.evolution-table__kpi-text {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  line-height: 1.2;
  color: var(--ft-text-primary);
}

.evolution-table__cell-value {
  font-size: var(--ft-text-base);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: var(--ft-text-primary);
}

.evolution-table__cell-delta {
  display: inline-flex;
  gap: var(--ft-space-1);
  align-items: center;
  margin-top: var(--ft-space-1);
}

.evolution-table__delta-pill {
  padding: 0 var(--ft-space-1);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  font-variant-numeric: tabular-nums;

  border: 1px solid transparent;
  border-radius: var(--ft-radius-full);
}

.evolution-delta--better {
  color: var(--ft-success-400);
}

.evolution-delta--worse {
  color: var(--ft-danger-400);
}

.evolution-delta--neutral {
  color: var(--ft-warning-400);
}

.evolution-table__delta-pill.evolution-delta--better {
  background: var(--ft-status-badge-success-bg);
  border-color: var(--ft-status-badge-success-border);
}

.evolution-table__delta-pill.evolution-delta--worse {
  background: var(--ft-status-badge-danger-bg);
  border-color: var(--ft-status-badge-danger-border);
}

.evolution-table__delta-pill.evolution-delta--neutral {
  background: var(--ft-status-badge-warning-bg);
  border-color: var(--ft-status-badge-warning-border);
}

.evolution-table__show-all {
  cursor: pointer;

  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-3);

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-primary-400);

  background: transparent;
  border: 1px solid var(--ft-primary-400);
  border-radius: var(--ft-radius-md);
}

@media (width <= 1024px) {
  .evolution-table__scroll {
    overflow-x: auto;
  }

  /* stylelint-disable selector-pseudo-class-no-unknown */
  .evolution-table__grid :deep(.p-datatable-table) {
    min-width: 1120px;
  }
  /* stylelint-enable selector-pseudo-class-no-unknown */
}

@media (width <= 640px) {
  .evolution-table__header {
    font-size: var(--ft-text-sm);
  }

  /* stylelint-disable selector-pseudo-class-no-unknown */
  .evolution-table__grid :deep(.p-datatable-thead > tr > th),
  .evolution-table__grid :deep(.p-datatable-tbody > tr > td) {
    padding: var(--ft-space-2) var(--ft-space-3);
  }

  .evolution-table__grid :deep(th.evolution-table__kpi-col),
  .evolution-table__grid :deep(td.evolution-table__kpi-col) {
    min-width: 170px;
  }

  .evolution-table__grid :deep(th.evolution-table__month-col),
  .evolution-table__grid :deep(td.evolution-table__month-col) {
    min-width: 120px;
  }
  /* stylelint-enable selector-pseudo-class-no-unknown */

  .evolution-table__kpi-text,
  .evolution-table__cell-value {
    font-size: var(--ft-text-base);
  }
}
</style>
