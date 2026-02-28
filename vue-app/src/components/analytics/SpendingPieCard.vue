<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ChartData, Plugin } from 'chart.js';
import UiButton from '../../ui/UiButton.vue';
import Skeleton from 'primevue/skeleton';
import Message from 'primevue/message';
import Chart from 'primevue/chart';
import SelectButton from 'primevue/selectbutton';
import Select from 'primevue/select';
import type { CategoryDatasetMode, CategoryLegendItem, CategoryScope } from '../../types/analytics';
import { useChartColors } from '../../composables/useChartColors';

const props = defineProps<{
  loading: boolean;
  error: string | null;
  chartData: ChartData<'pie', number[], string> | null;
  legend: CategoryLegendItem[];
  currency: string;
  mode: CategoryDatasetMode;
  modeOptions: Array<{ label: string; value: CategoryDatasetMode }>;
  scope: CategoryScope;
  scopeOptions: Array<{ label: string; value: CategoryScope }>;
}>();

const emit = defineEmits<{
  (event: 'retry'): void;
  (event: 'select-category', value: CategoryLegendItem): void;
  (event: 'update:mode', value: CategoryDatasetMode): void;
  (event: 'update:scope', value: CategoryScope): void;
}>();

const { colors, tooltipConfig } = useChartColors();

const chartRef = ref<InstanceType<typeof Chart>>();
const isOtherExpanded = ref(false);

watch(() => [props.mode, props.scope, props.legend], () => {
  isOtherExpanded.value = false;
});


function highlightSlice(index: number) {
  const chart = chartRef.value?.getChart();
  if (!chart) return;
  const point = { datasetIndex: 0, index };
  chart.setActiveElements([point]);
  chart.tooltip?.setActiveElements([point], { x: 0, y: 0 });
  chart.update('none');
}

function clearHighlight() {
  const chart = chartRef.value?.getChart();
  if (!chart) return;
  chart.setActiveElements([]);
  chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
  chart.update('none');
}

const currencyFormatter = computed(() =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: props.currency,
    maximumFractionDigits: 0,
  })
);

function fmtAmount(amount: number): string {
  return currencyFormatter.value.format(amount);
}

interface LegendRow {
  key: string;
  item: CategoryLegendItem;
  isOther: boolean;
  isChild: boolean;
  sliceIndex: number;
}

const legendRows = computed<LegendRow[]>(() => {
  const rows: LegendRow[] = [];
  let otherIdx = -1;
  props.legend.forEach((item, index) => {
    const isOther = item.id === '__other__';
    if (isOther) otherIdx = index;
    rows.push({ key: item.id, item, isOther, isChild: false, sliceIndex: index });
    if (isOther && isOtherExpanded.value && item.children) {
      item.children.forEach((child) => {
        rows.push({ key: child.id, item: child, isOther: false, isChild: true, sliceIndex: otherIdx });
      });
    }
  });
  return rows;
});

function handleLegendClick(row: LegendRow) {
  if (row.isOther) {
    isOtherExpanded.value = !isOtherExpanded.value;
  } else {
    emit('select-category', row.item);
  }
}

const showEmpty = computed(
  () => !props.loading && !props.error && (!props.chartData || props.legend.length === 0)
);
const isExpensesMode = computed(() => props.mode === 'expenses');

const totalAmount = computed(() => {
  return props.legend.reduce((sum, item) => sum + item.amount, 0);
});

const chartTitle = computed(() => (isExpensesMode.value ? 'Расходы по категориям' : 'Доходы по категориям'));
const chartHint = computed(() => (
  isExpensesMode.value
    ? 'Показывает, на что уходят деньги. Кликните на категорию, чтобы увидеть транзакции.'
    : 'Показывает источники поступлений. Кликните на категорию, чтобы увидеть транзакции.'
));
const errorTitle = computed(() => (
  isExpensesMode.value
    ? 'Не удалось загрузить структуру расходов'
    : 'Не удалось загрузить структуру доходов'
));
const emptyHint = computed(() => (
  isExpensesMode.value
    ? 'Добавьте расходы, чтобы увидеть распределение.'
    : 'Добавьте доходы, чтобы увидеть распределение.'
));
const chartAriaLabel = computed(() => (
  isExpensesMode.value
    ? 'Круговая диаграмма расходов по категориям'
    : 'Круговая диаграмма доходов по категориям'
));

const formattedTotal = computed(() => {
  if (totalAmount.value <= 0) return '—';
  return totalAmount.value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: props.currency,
    maximumFractionDigits: 0,
  });
});

const centerTextPlugin = computed<Plugin<'doughnut'>>(() => ({
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, width, height } = chart;
    if (!ctx) return;
    ctx.save();

    const text = formattedTotal.value;
    const fontSize = Math.min(width, height) * 0.08;
    ctx.font = `bold ${fontSize}px Inter`;
    ctx.fillStyle = colors.tooltipText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);

    ctx.restore();
  },
}));

const donutChartData = computed(() => {
  if (!props.chartData) return null;
  return {
    ...props.chartData,
    datasets: props.chartData.datasets.map(ds => ({
      ...ds,
      borderWidth: 2,
      borderColor: colors.surface,
      hoverBorderWidth: 3,
      hoverOffset: 8,
    })),
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 1,
  cutout: '65%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      ...tooltipConfig(),
      callbacks: {
        label(context: { parsed: number; label: string }) {
          const formatted = context.parsed.toLocaleString('ru-RU', {
            style: 'currency',
            currency: props.currency,
            maximumFractionDigits: 0,
          });
          return `${context.label}: ${formatted}`;
        },
      },
    },
  },
}));
</script>

<template>
  <div class="donut-card">
    <div class="donut-card__head">
      <div>
        <div class="donut-card__title-row">
          <h3 class="donut-card__title">
            {{ chartTitle }}
          </h3>
          <button
            v-tooltip="{ value: chartHint, event: 'click', autoHide: false }"
            type="button"
            class="donut-card__hint"
            aria-label="Подсказка"
          >
            <i class="pi pi-question-circle" />
          </button>
        </div>
      </div>
      <div class="donut-card__controls">
        <SelectButton
          :model-value="mode"
          :options="modeOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          class="ft-select-button donut-card__mode-toggle"
          @update:model-value="emit('update:mode', $event as CategoryDatasetMode)"
        />
        <Select
          v-if="isExpensesMode"
          :model-value="scope"
          :options="scopeOptions"
          option-label="label"
          option-value="value"
          class="donut-card__scope-select"
          append-to="body"
          @update:model-value="emit('update:scope', $event as CategoryScope)"
        />
        <div
          v-else
          class="donut-card__scope-select-placeholder"
          aria-hidden="true"
        />
      </div>
    </div>

    <div
      v-if="loading"
      class="donut-card__loading"
    >
      <Skeleton
        width="220px"
        height="220px"
        border-radius="999px"
      />
      <div class="donut-card__loading-legend">
        <Skeleton
          v-for="i in 4"
          :key="i"
          height="18px"
          width="70%"
        />
      </div>
    </div>

    <div
      v-else-if="error"
      class="donut-card__message"
    >
      <Message
        severity="error"
        icon="pi pi-exclamation-triangle"
        :closable="false"
      >
        <div class="donut-card__message-body">
          <p class="donut-card__message-title">
            {{ errorTitle }}
          </p>
          <p class="donut-card__message-text">
            {{ error }}
          </p>
          <UiButton
            label="Попробовать снова"
            icon="pi pi-refresh"
            size="sm"
            @click="emit('retry')"
          />
        </div>
      </Message>
    </div>

    <div
      v-else-if="showEmpty"
      class="donut-card__message"
    >
      <Message
        severity="info"
        icon="pi pi-inbox"
        :closable="false"
      >
        <div class="donut-card__message-body donut-card__message-body--compact">
          <p class="donut-card__message-title">
            Нет данных за период
          </p>
          <p class="donut-card__message-text">
            {{ emptyHint }}
          </p>
        </div>
      </Message>
    </div>

    <div
      v-else
      class="donut-card__content"
    >
      <div
        class="donut-card__chart"
        role="img"
        :aria-label="chartAriaLabel"
      >
        <Chart
          v-if="donutChartData"
          ref="chartRef"
          type="doughnut"
          :data="donutChartData"
          :options="chartOptions"
          :plugins="[centerTextPlugin]"
        />
      </div>
      <ul class="donut-card__legend">
        <li
          v-for="row in legendRows"
          :key="row.key"
          class="donut-card__legend-item"
          :class="{
            'donut-card__legend-item--other': row.isOther,
            'donut-card__legend-item--child': row.isChild,
          }"
          role="button"
          tabindex="0"
          :aria-expanded="row.isOther ? isOtherExpanded : undefined"
          :aria-label="`${row.item.name}, ${fmtAmount(row.item.amount)}, ${row.item.percent.toFixed(1)}%`"
          @click="handleLegendClick(row)"
          @keydown.enter.prevent="handleLegendClick(row)"
          @keydown.space.prevent="handleLegendClick(row)"
          @mouseenter="highlightSlice(row.sliceIndex)"
          @mouseleave="clearHighlight"
        >
          <span
            class="donut-card__legend-color"
            :class="{ 'donut-card__legend-color--sm': row.isChild }"
            :style="{ backgroundColor: row.item.color }"
          />
          <div class="donut-card__legend-body">
            <span class="donut-card__legend-name">{{ row.item.name }}</span>
            <span class="donut-card__legend-amount">{{ fmtAmount(row.item.amount) }}</span>
          </div>
          <span
            class="donut-card__legend-percent"
            :class="{ 'donut-card__legend-percent--sm': row.isChild }"
          >{{ row.item.percent.toFixed(1) }}%</span>
          <i
            v-if="row.isOther"
            class="pi donut-card__legend-chevron"
            :class="isOtherExpanded ? 'pi-chevron-up' : 'pi-chevron-down'"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped src="../../styles/components/spending-pie-card.css"></style>
