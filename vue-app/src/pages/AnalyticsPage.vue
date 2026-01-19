<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '../components/common/PageHeader.vue';
import HeroHealthCard from '../components/analytics/HeroHealthCard.vue';
import SpendingPieCard from '../components/analytics/SpendingPieCard.vue';
import NetWorthLineCard from '../components/analytics/NetWorthLineCard.vue';
import SpendingBarsCard from '../components/analytics/SpendingBarsCard.vue';
import ForecastCard from '../components/analytics/ForecastCard.vue';
import CategoryDeltaCard from '../components/analytics/CategoryDeltaCard.vue';
import SpendingPatternsCard from '../components/analytics/SpendingPatternsCard.vue';
import { useUserStore } from '../stores/user';
import { apiService } from '../services/api.service';
import type {
  CategoryExpenseDto,
  FinancialHealthMetricsDto,
  MonthlyExpenseDto,
  NetWorthSnapshotDto,
} from '../types';
import type {
  CategoryLegendItem,
  ExpenseGranularity,
  FinancialHealthMetricRow,
  FinancialHealthVerdict,
  ForecastSummary,
  HealthStatus,
} from '../types/analytics';
import PageContainer from "@/components/layout/PageContainer.vue";

type FinancialMetricKey = 'savingsRate' | 'expenseVolatility' | 'meanMedianRatio';

interface MetricDefinition {
  key: FinancialMetricKey;
  getValue: (metrics: FinancialHealthMetricsDto | null) => number | null;
  format: (value: number | null, currency: string) => string;
  evaluate: (value: number | null) => { status: HealthStatus; score: number } | null;
}

interface SummaryCard {
  title: string;
  value: string;
  icon?: string;
  trend?: number | null;
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

interface CategoryDeltaItem {
  id: string;
  name: string;
  color: string;
  currentAmount: number;
  previousAmount: number;
  deltaAmount: number;
  deltaPercent: number | null;
}

interface PeakDayItem {
  label: string;
  amount: number;
}

const userStore = useUserStore();

const healthPeriodOptions: Array<{ label: string; value: number }> = [
  { label: '1 месяц', value: 1 },
  { label: '3 месяца', value: 3 },
  { label: '6 месяцев', value: 6 },
  { label: '12 месяцев', value: 12 },
];
const selectedHealthPeriod = ref<number>(6);

const categoryPeriodOptions: Array<{ label: string; value: number }> = [
  { label: '1', value: 1 },
  { label: '3', value: 3 },
  { label: '6', value: 6 },
  { label: '12', value: 12 },
];
const selectedCategoryPeriod = ref<number>(3);

const granularityOptions: Array<{ label: string; value: ExpenseGranularity }> = [
  { label: 'День', value: 'days' },
  { label: 'Неделя', value: 'weeks' },
  { label: 'Месяц', value: 'months' },
] ;
const selectedGranularity = ref<ExpenseGranularity>('months');

const financialMetrics = ref<FinancialHealthMetricsDto | null>(null);
const healthLoading = ref(false);
const healthError = ref<string | null>(null);

const categoryExpenses = ref<CategoryExpenseDto[]>([]);
const categoryExpensesPrevious = ref<CategoryExpenseDto[]>([]);
const categoryLoading = ref(false);
const categoryError = ref<string | null>(null);
const categoryDeltaError = ref<string | null>(null);

const netWorthSnapshots = ref<NetWorthSnapshotDto[]>([]);
const netWorthLoading = ref(false);
const netWorthError = ref<string | null>(null);

const expensesData = reactive<Record<ExpenseGranularity, MonthlyExpenseDto[]>>({
  days: [],
  weeks: [],
  months: [],
});
const expensesLoading = reactive<Record<ExpenseGranularity, boolean>>({
  days: false,
  weeks: false,
  months: false,
});
const expensesError = reactive<Record<ExpenseGranularity, string | null>>({
  days: null,
  weeks: null,
  months: null,
});

const chartPalette = reactive({
  primary: '#60a5fa',
  surface: '#94a3b8',
  accent: '#f97316',
  categories: ['#60a5fa', '#14b8a6', '#a855f7', '#06b6d4', '#fb923c'],
});

const baseCurrency = computed(() => userStore.baseCurrencyCode ?? 'RUB');

const metricDefinitions: MetricDefinition[] = [
  {
    key: 'savingsRate',
    getValue: (metrics) => metrics?.savingsRate ?? null,
    format: (value, _currency) => formatPercent(value),
    evaluate: (value) => {
      if (value == null) return null;
      if (value >= 0.25) return { status: 'good', score: 90 };
      if (value >= 0.05) return { status: 'average', score: 60 };
      return { status: 'poor', score: 25 };
    },
  },
  {
    key: 'expenseVolatility',
    getValue: (metrics) => metrics?.expenseVolatility ?? null,
    format: (value, _currency) => formatPercent(value),
    evaluate: (value) => {
      if (value == null) return null;
      if (value <= 0.2) return { status: 'good', score: 85 };
      if (value <= 0.45) return { status: 'average', score: 55 };
      return { status: 'poor', score: 20 };
    },
  },
  {
    key: 'meanMedianRatio',
    getValue: () => meanMedianRatio.value,
    format: (value, _currency) => (value == null ? '—' : `${value.toFixed(2)}×`),
    evaluate: (value) => {
      if (value == null) return null;
      if (value <= 1.15) return { status: 'good', score: 85 };
      if (value <= 1.35) return { status: 'average', score: 55 };
      return { status: 'poor', score: 25 };
    },
  },
];

const metricPresentation: Record<
  FinancialMetricKey,
  {
    label: string;
    tooltip: string;
    flair: Record<HealthStatus, { emoji: string; statusLabel: string }>;
  }
> = {
  savingsRate: {
    label: 'Уровень сбережений',
    tooltip: 'Доля доходов, которые остаются у вас после всех расходов.',
    flair: {
      good: { emoji: '🚀', statusLabel: 'С запасом' },
      average: { emoji: '🧭', statusLabel: 'Нужен апгрейд' },
      poor: { emoji: '🌱', statusLabel: 'Тревога' },
    },
  },
  expenseVolatility: {
    label: 'Стабильность расходов',
    tooltip: 'Насколько сильно траты скачут от месяца к месяцу.',
    flair: {
      good: { emoji: '🧠', statusLabel: 'Контроль идеален' },
      average: { emoji: '⚖️', statusLabel: 'Следите внимательнее' },
      poor: { emoji: '🌪️', statusLabel: 'Сгладьте скачки' },
    },
  },
  meanMedianRatio: {
    label: 'Соотношение mean/median',
    tooltip:
      'Показывает, насколько траты искажаются пиковыми днями. Чем ближе к 1, тем стабильнее.',
    flair: {
      good: { emoji: '🎛️', statusLabel: 'Стабильно' },
      average: { emoji: '⚖️', statusLabel: 'Есть всплески' },
      poor: { emoji: '⚠️', statusLabel: 'Сильные всплески' },
    },
  },
};

function resolveCssVariables() {
  if (typeof window === 'undefined') return;
  const styles = getComputedStyle(document.documentElement);
  chartPalette.primary = styles.getPropertyValue('--primary-400').trim() || chartPalette.primary;
  chartPalette.surface = styles.getPropertyValue('--surface-500').trim() || chartPalette.surface;
  chartPalette.accent = styles.getPropertyValue('--orange-400').trim() || chartPalette.accent;
  const fallback = [
    styles.getPropertyValue('--blue-400').trim(),
    styles.getPropertyValue('--teal-400').trim(),
    styles.getPropertyValue('--violet-400').trim(),
    styles.getPropertyValue('--cyan-400').trim(),
    styles.getPropertyValue('--orange-400').trim(),
  ].filter(Boolean);
  if (fallback.length) {
    chartPalette.categories = fallback;
  }
}

function formatPercent(value: number | null, fractionDigits = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

function formatMoney(value: number | null, maximumFractionDigits = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: baseCurrency.value,
    maximumFractionDigits,
  });
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'userMessage' in error) {
    const message = (error as { userMessage?: string }).userMessage;
    if (typeof message === 'string' && message.trim().length) {
      return message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function formatMonthPeriod(months: number): string {
  const lastDigit = months % 10;
  if (months % 100 >= 11 && months % 100 <= 19) {
    return `${months} месяцев`;
  }
  if (lastDigit === 1) return `${months} месяц`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${months} месяца`;
  return `${months} месяцев`;
}

function computeMedian(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

async function loadFinancialHealth(period: number) {
  if (healthLoading.value) return;
  healthLoading.value = true;
  healthError.value = null;
  try {
    const data = await apiService.getFinancialHealthMetrics(period);
    financialMetrics.value = data;
  } catch (error) {
    healthError.value = resolveErrorMessage(error, 'Не удалось получить показатели финансового здоровья.');
    financialMetrics.value = null;
  } finally {
    healthLoading.value = false;
  }
}

function computeFinancialMetricRows(): FinancialHealthMetricRow[] {
  const metrics = financialMetrics.value;
  if (!metrics) return [];

  const rows: FinancialHealthMetricRow[] = [];
  let hasRealData = false;

  for (const definition of metricDefinitions) {
    const value = definition.getValue(metrics);
    if (value != null) {
      hasRealData = true;
    }
    const evaluation = definition.evaluate(value);
    const status = evaluation?.status ?? 'average';
    const presentation = metricPresentation[definition.key];
    const flairMeta = presentation.flair[status];
    rows.push({
      key: definition.key,
      label: presentation.label,
      value: definition.format(value, baseCurrency.value),
      status,
      statusLabel: flairMeta.statusLabel,
      flair: flairMeta.statusLabel,
      emoji: flairMeta.emoji,
      tooltip: presentation.tooltip,
    });
  }
  return hasRealData ? rows : [];
}

const financialMetricRows = computed(() => computeFinancialMetricRows());

const financialScore = computed(() => {
  const metrics = financialMetrics.value;
  if (!metrics) return null;
  const evaluations = metricDefinitions
    .map((definition) => definition.evaluate(metrics[definition.key]))
    .filter((item): item is { status: HealthStatus; score: number } => item != null);

  if (!evaluations.length) return null;
  const total = evaluations.reduce((sum, item) => sum + item.score, 0);
  return Math.round(total / evaluations.length);
});

const financialVerdict = computed<FinancialHealthVerdict | null>(() => {
  const score = financialScore.value;
  if (score == null) return null;

  if (score >= 70) {
    return {
      label: 'Хорошо',
      status: 'good',
      helper: 'Продолжайте придерживаться текущей стратегии.',
    };
  }

  if (score >= 45) {
    return {
      label: 'Средне',
      status: 'average',
      helper: 'Подумайте о сокращении нестабильных расходов.',
    };
  }

  return {
    label: 'Плохо',
    status: 'poor',
    helper: 'Усилите контроль расходов и создайте резерв.',
  };
});

async function loadCategoryExpenses(periodMonths: number) {
  if (categoryLoading.value) return;
  categoryLoading.value = true;
  categoryError.value = null;
  categoryDeltaError.value = null;
  try {
    const { from, to } = resolvePeriodRange(periodMonths);
    const data = await apiService.getExpensesByCategoryByDateRange(from, to);
    categoryExpenses.value = data ?? [];

    try {
      const previousRange = resolvePreviousPeriodRange(periodMonths);
      const previousData = await apiService.getExpensesByCategoryByDateRange(
        previousRange.from,
        previousRange.to
      );
      categoryExpensesPrevious.value = previousData ?? [];
    } catch (error) {
      categoryDeltaError.value = resolveErrorMessage(
        error,
        'Не удалось загрузить данные для сравнения.'
      );
      categoryExpensesPrevious.value = [];
    }
  } catch (error) {
    categoryError.value = resolveErrorMessage(error, 'Не удалось загрузить расходы по категориям.');
    categoryExpenses.value = [];
    categoryDeltaError.value = categoryError.value;
    categoryExpensesPrevious.value = [];
  } finally {
    categoryLoading.value = false;
  }
}

function resolvePeriodRange(months: number) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1 - months, 1, 0, 0, 0));
  return { from: start, to: end };
}

function resolvePreviousPeriodRange(months: number) {
  const current = resolvePeriodRange(months);
  const previousEnd = current.from;
  const previousStart = new Date(
    Date.UTC(previousEnd.getUTCFullYear(), previousEnd.getUTCMonth() - months, 1, 0, 0, 0)
  );
  return { from: previousStart, to: previousEnd };
}

async function loadNetWorth() {
  if (netWorthLoading.value) return;
  netWorthLoading.value = true;
  netWorthError.value = null;
  try {
    const snapshots = await apiService.getNetWorthTrend();
    netWorthSnapshots.value = snapshots ?? [];
  } catch (error) {
    netWorthError.value = resolveErrorMessage(error, 'Не удалось загрузить динамику капитала.');
    netWorthSnapshots.value = [];
  } finally {
    netWorthLoading.value = false;
  }
}

async function loadExpenses(granularity: ExpenseGranularity, force = false) {
  if (expensesLoading[granularity]) return;
  if (expensesData[granularity].length && !force) return;

  expensesLoading[granularity] = true;
  expensesError[granularity] = null;
  try {
    const data = await apiService.getExpensesByGranularity(granularity);
    expensesData[granularity] = data ?? [];
  } catch (error) {
    expensesError[granularity] = resolveErrorMessage(error, 'Не удалось загрузить расходы.');
    expensesData[granularity] = [];
  } finally {
    expensesLoading[granularity] = false;
  }
}

const categoryLegend = computed<CategoryLegendItem[]>(() => {
  if (!categoryExpenses.value.length) return [];
  const total = categoryExpenses.value.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  return categoryExpenses.value.map((item, index) => ({
    id: item.id,
    name: item.name,
    amount: Number(item.amount ?? 0),
    percent: total > 0 ? (Number(item.amount ?? 0) / total) * 100 : 0,
    color: item.color?.trim() ?? chartPalette.categories[index % chartPalette.categories.length],
  }));
});

const categoryChartData = computed(() => {
  if (!categoryLegend.value.length) return null;
  return {
    labels: categoryLegend.value.map((item) => item.name),
    datasets: [
      {
        data: categoryLegend.value.map((item) => item.amount),
        backgroundColor: categoryLegend.value.map((item) => item.color),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
      },
    ],
  };
});

const categoryPeriodLabel = computed(() => formatMonthPeriod(selectedCategoryPeriod.value));

const categoryDelta = computed<{
  increased: CategoryDeltaItem[];
  decreased: CategoryDeltaItem[];
}>(() => {
  if (!categoryExpenses.value.length || !categoryExpensesPrevious.value.length) {
    return { increased: [], decreased: [] };
  }

  const currentMap = new Map<string, CategoryExpenseDto>();
  const previousMap = new Map<string, CategoryExpenseDto>();

  categoryExpenses.value.forEach((item) => currentMap.set(item.id, item));
  categoryExpensesPrevious.value.forEach((item) => previousMap.set(item.id, item));

  const allIds = new Set<string>([...currentMap.keys(), ...previousMap.keys()]);
  const entries: CategoryDeltaItem[] = [];

  allIds.forEach((id) => {
    const current = currentMap.get(id);
    const previous = previousMap.get(id);
    const currentAmount = Number(current?.amount ?? 0);
    const previousAmount = Number(previous?.amount ?? 0);
    if (!currentAmount && !previousAmount) return;

    const deltaAmount = currentAmount - previousAmount;
    const deltaPercent =
      previousAmount > 0 ? (deltaAmount / previousAmount) * 100 : null;

    entries.push({
      id,
      name: current?.name ?? previous?.name ?? 'Без категории',
      color:
        current?.color?.trim() ??
        previous?.color?.trim() ??
        chartPalette.categories[0],
      currentAmount,
      previousAmount,
      deltaAmount,
      deltaPercent,
    });
  });

  const increased = entries
    .filter((item) => item.deltaAmount > 0)
    .sort((a, b) => b.deltaAmount - a.deltaAmount)
    .slice(0, 4);
  const decreased = entries
    .filter((item) => item.deltaAmount < 0)
    .sort((a, b) => a.deltaAmount - b.deltaAmount)
    .slice(0, 4);

  return { increased, decreased };
});

const monthlySortedExpenses = computed(() => {
  return [...expensesData.months].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
});

const currentMonthEntry = computed(() => {
  const items = monthlySortedExpenses.value;
  if (!items.length) return null;
  return items[items.length - 1];
});

const previousMonthEntry = computed(() => {
  const items = monthlySortedExpenses.value;
  if (items.length < 2) return null;
  return items[items.length - 2];
});

const currentMonthDaily = computed(() => {
  const current = currentMonthEntry.value;
  if (!current) return [];
  return expensesData.days.filter(
    (entry) => entry.year === current.year && entry.month === current.month
  );
});

const currentMonthLabel = computed(() => {
  const current = currentMonthEntry.value;
  if (!current) return '';
  return formatMonthLabel(current.year, current.month);
});

const currentMonthTotal = computed(() => {
  const dailyTotal = currentMonthDaily.value.reduce(
    (sum, entry) => sum + Number(entry.amount ?? 0),
    0
  );
  const fallback = currentMonthEntry.value?.amount;
  if (fallback != null) return Number(fallback);
  return dailyTotal > 0 ? dailyTotal : null;
});

const currentMonthMaxDay = computed(() => {
  if (!currentMonthDaily.value.length) return null;
  return Math.max(...currentMonthDaily.value.map((entry) => Number(entry.amount ?? 0)));
});

const monthOverMonthChange = computed(() => {
  const current = currentMonthEntry.value?.amount;
  const previous = previousMonthEntry.value?.amount;
  if (current == null || previous == null || Number(previous) === 0) return null;
  return Number((((Number(current) - Number(previous)) / Number(previous)) * 100).toFixed(1));
});

const topCategory = computed(() => {
  if (!categoryLegend.value.length) return null;
  return [...categoryLegend.value].sort((a, b) => b.amount - a.amount)[0] ?? null;
});

const summaryCards = computed<SummaryCard[]>(() => {
  const cards: SummaryCard[] = [
    {
      title: 'Всего за месяц',
      value: formatMoney(currentMonthTotal.value),
      icon: 'pi-wallet',
      trend: monthOverMonthChange.value,
      trendLabel: 'к прошлому мес.',
      variant:
        monthOverMonthChange.value == null
          ? 'default'
          : monthOverMonthChange.value > 0
            ? 'danger'
            : 'success',
    },
    {
      title: 'Максимум за день',
      value: formatMoney(currentMonthMaxDay.value),
      icon: 'pi-arrow-up-right',
    },
    {
      title: 'Топ-категория',
      value: topCategory.value
        ? `${topCategory.value.name} · ${topCategory.value.percent.toFixed(1)}%`
        : '—',
      icon: 'pi-chart-pie',
    },
  ];

  return cards;
});

const dailyAmounts = computed(() =>
  currentMonthDaily.value.map((entry) => Number(entry.amount ?? 0)).filter((value) => value > 0)
);

const dailyMean = computed(() => {
  if (!dailyAmounts.value.length) return null;
  const total = dailyAmounts.value.reduce((sum, value) => sum + value, 0);
  return total / dailyAmounts.value.length;
});

const dailyMedian = computed(() => computeMedian(dailyAmounts.value));

const meanMedianRatio = computed(() => {
  if (dailyMean.value == null || dailyMedian.value == null || dailyMedian.value === 0) {
    return null;
  }
  return dailyMean.value / dailyMedian.value;
});

const spikeThreshold = computed(() => {
  if (dailyMedian.value == null) return null;
  return dailyMedian.value * 2;
});

const spikeDaysCount = computed(() => {
  if (spikeThreshold.value == null) return null;
  return dailyAmounts.value.filter((amount) => amount > spikeThreshold.value!).length;
});

const peakDays = computed<PeakDayItem[]>(() => {
  if (!currentMonthDaily.value.length) return [];
  return [...currentMonthDaily.value]
    .sort((a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0))
    .slice(0, 3)
    .map((entry) => ({
      label: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(
        new Date(entry.year, entry.month - 1, entry.day ?? 1)
      ),
      amount: Number(entry.amount ?? 0),
    }));
});

const patternsEmpty = computed(() => !currentMonthDaily.value.length);

const sortedNetWorth = computed(() => {
  return [...netWorthSnapshots.value].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
});

const visibleNetWorth = computed(() => {
  return sortedNetWorth.value;
});

const netWorthChartData = computed(() => {
  const entries = visibleNetWorth.value;
  if (!entries.length) return null;
  const labels = entries.map((entry) => formatMonthLabel(entry.year, entry.month));
  return {
    labels,
    datasets: [
      {
        label: 'Общий баланс',
        data: entries.map((entry) => Number(entry.totalBalance ?? 0)),
        borderColor: chartPalette.primary,
        backgroundColor: `rgba(${extractRgb(chartPalette.primary)}, 0.18)`,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: chartPalette.primary,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };
});

function formatMonthLabel(year: number, month: number): string {
  const formatter = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric' });
  return formatter.format(new Date(year, month - 1, 1));
}

function extractRgb(color: string): string {
  if (typeof document === 'undefined') {
    return '59,130,246';
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '59,130,246';
  ctx.fillStyle = color;
  const computed = ctx.fillStyle as string;
  const rgbMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return `${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]}`;
  }
  const match = computed.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match || !match[1] || !match[2] || !match[3]) return '59,130,246';
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `${r},${g},${b}`;
}

const expensesChartData = computed(() => {
  const data = getSortedExpenses(selectedGranularity.value);
  if (!data.length) return null;
  const labels = data.map((item) => formatExpenseLabel(item, selectedGranularity.value));
  return {
    labels,
    datasets: [
      {
        data: data.map((item) => Number(item.amount ?? 0)),
        backgroundColor: `rgba(${extractRgb(chartPalette.accent)}, 0.65)`,
        borderColor: chartPalette.accent,
        borderRadius: 8,
        maxBarThickness: 48,
      },
    ],
  };
});

function getSortedExpenses(granularity: ExpenseGranularity): MonthlyExpenseDto[] {
  const items = expensesData[granularity] ?? [];
  const sorted = [...items].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    if (granularity === 'days') return (a.day ?? 0) - (b.day ?? 0);
    if (granularity === 'weeks') return (a.week ?? 0) - (b.week ?? 0);
    return 0;
  });

  const limit = granularity === 'days' ? 30 : granularity === 'weeks' ? 16 : 18;
  return sorted.slice(Math.max(sorted.length - limit, 0));
}

function formatExpenseLabel(entry: MonthlyExpenseDto, granularity: ExpenseGranularity): string {
  if (granularity === 'days' && entry.day != null) {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(entry.year, entry.month - 1, entry.day));
  }

  if (granularity === 'weeks' && entry.week != null) {
    return `Неделя ${entry.week}`;
  }

  return formatMonthLabel(entry.year, entry.month);
}

const forecastModel = computed<{
  summary: ForecastSummary | null;
  chartData: any | null;
}>(() => {
  const daily = expensesData.days;
  const monthly = expensesData.months;
  if (!daily.length) {
    return { summary: null, chartData: null };
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const today = now.getUTCDate();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const dailyCurrent = daily.filter(
    (entry) => entry.year === currentYear && entry.month === currentMonth && entry.day != null,
  );

  if (!dailyCurrent.length) {
    return { summary: null, chartData: null };
  }

  const sumsByDay = new Map<number, number>();
  for (const entry of dailyCurrent) {
    const day = entry.day ?? 0;
    if (!day) continue;
    sumsByDay.set(day, (sumsByDay.get(day) ?? 0) + Number(entry.amount ?? 0));
  }

  const monthlySorted = [...monthly].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  const currentIndex = monthlySorted.findIndex(
    (entry) => entry.year === currentYear && entry.month === currentMonth,
  );

  const previous = currentIndex > 0 ? monthlySorted[currentIndex - 1] : null;
  const baselineLimit =
    previous && Number(previous.amount ?? 0) > 0 ? Number(previous.amount ?? 0) : null;

  let cumulative = 0;
  const labels: string[] = [];
  const actualData: Array<number | null> = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    labels.push(day.toString());
    const dayAmount = sumsByDay.get(day) ?? 0;
    cumulative += dayAmount;
    if (day <= today) {
      actualData.push(Number(cumulative.toFixed(2)));
    } else {
      actualData.push(null);
    }
  }

  const currentSpent = actualData[today - 1] ?? cumulative;
  const daysElapsed = Math.max(today, 1);
  const dailyAverage = currentSpent / daysElapsed;
  const forecastTotal = dailyAverage * daysInMonth;

  const forecastData = Array.from({ length: daysInMonth }, (_, index) =>
    Number((dailyAverage * (index + 1)).toFixed(2)),
  );

  const baselineData = baselineLimit
    ? Array.from({ length: daysInMonth }, () => Number(baselineLimit.toFixed(2)))
    : [];

  const status: HealthStatus | null = baselineLimit
    ? forecastTotal <= baselineLimit * 0.9
      ? 'good'
      : forecastTotal <= baselineLimit * 1.05
        ? 'average'
        : 'poor'
    : null;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Факт',
        data: actualData,
        borderColor: chartPalette.accent,
        backgroundColor: `rgba(${extractRgb(chartPalette.accent)}, 0.18)`,
        fill: true,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: chartPalette.accent,
        pointBorderColor: '#ffffff',
        spanGaps: false,
      },
      {
        label: 'Прогноз',
        data: forecastData,
        borderColor: chartPalette.primary,
        borderDash: [8, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.25,
      },
      ...(baselineLimit
        ? [
            {
              label: 'Лимит прошлого месяца',
              data: baselineData,
              borderColor: chartPalette.surface,
              borderDash: [4, 4],
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false,
              tension: 0,
            },
          ]
        : []),
    ],
  };

  return {
    summary: {
      forecastTotal,
      currentSpent,
      baselineLimit,
      status,
    },
    chartData,
  };
});

const forecastSummary = computed(() => forecastModel.value.summary);
const forecastChartData = computed(() => forecastModel.value.chartData);

const forecastLoading = computed(() => expensesLoading.days || expensesLoading.months);

const forecastError = computed(() => expensesError.days ?? expensesError.months);

function retryHealth() {
  void loadFinancialHealth(selectedHealthPeriod.value);
}

function retryCategories() {
  void loadCategoryExpenses(selectedCategoryPeriod.value);
}

function retryNetWorthData() {
  void loadNetWorth();
}

function retryExpensesData() {
  void loadExpenses(selectedGranularity.value, true);
}

function retryDailyExpenses() {
  void loadExpenses('days', true);
}

function retryForecastData() {
  void Promise.all([loadExpenses('months', true), loadExpenses('days', true)]);
}

watch(selectedHealthPeriod, (period) => {
  if (period && period > 0) {
    void loadFinancialHealth(period);
  }
});

watch(selectedCategoryPeriod, (period) => {
  if (period && period > 0) {
    void loadCategoryExpenses(period);
  }
});

watch(selectedGranularity, (granularity) => {
  if (granularity) {
    void loadExpenses(granularity);
  }
});

onMounted(async () => {
  resolveCssVariables();
  await userStore.fetchCurrentUser();
  await Promise.all([
    loadFinancialHealth(selectedHealthPeriod.value),
    loadCategoryExpenses(selectedCategoryPeriod.value),
    loadNetWorth(),
    loadExpenses('months'),
    loadExpenses('days'),
  ]);
});
</script>

<template>
  <PageContainer class="analytics-page">
    <PageHeader
      title="Аналитика"
      subtitle="Отслеживайте баланс, структуру расходов и прогноз в одном месте"
    />

    <section class="analytics-summary">
      <div class="analytics-summary__header">
        <div>
          <h3>Сводка месяца</h3>
          <p class="analytics-summary__meta">
            {{ currentMonthLabel ? `Данные за ${currentMonthLabel}` : 'Данные за последний доступный месяц' }}
          </p>
        </div>
      </div>
      <div class="analytics-summary__grid">
        <KPICard
          v-for="card in summaryCards"
          :key="card.title"
          :title="card.title"
          :value="card.value"
          :icon="card.icon"
          :trend="card.trend"
          :trend-label="card.trendLabel"
          :variant="card.variant"
        />
      </div>
    </section>

    <div class="analytics-grid">
      <HeroHealthCard
        class="analytics-grid__hero"
        :loading="healthLoading"
        :error="healthError"
        :metrics="financialMetricRows"
        :score="financialScore"
        :verdict="financialVerdict"
        :period="selectedHealthPeriod"
        :period-options="healthPeriodOptions"
        @retry="retryHealth"
        @update:period="selectedHealthPeriod = $event"
      />

      <SpendingPieCard
        class="analytics-grid__pie"
        :loading="categoryLoading"
        :error="categoryError"
        :period="selectedCategoryPeriod"
        :period-options="categoryPeriodOptions"
        :chart-data="categoryChartData"
        :legend="categoryLegend"
        :currency="baseCurrency"
        @update:period="selectedCategoryPeriod = $event"
        @retry="retryCategories"
      />

      <SpendingBarsCard
        class="analytics-grid__spending"
        :loading="expensesLoading[selectedGranularity]"
        :error="expensesError[selectedGranularity]"
        :granularity="selectedGranularity"
        :granularity-options="granularityOptions"
        :chart-data="expensesChartData"
        :empty="!expensesChartData"
        :currency="baseCurrency"
        @update:granularity="selectedGranularity = $event"
        @retry="retryExpensesData"
      />

      <CategoryDeltaCard
        class="analytics-grid__delta"
        :loading="categoryLoading"
        :error="categoryDeltaError"
        :period-label="categoryPeriodLabel"
        :increased="categoryDelta.increased"
        :decreased="categoryDelta.decreased"
        :currency="baseCurrency"
        @retry="retryCategories"
      />

      <SpendingPatternsCard
        class="analytics-grid__patterns"
        :loading="expensesLoading.days"
        :error="expensesError.days"
        :empty="patternsEmpty"
        :peaks="peakDays"
        :spike-count="spikeDaysCount"
        :median-daily="dailyMedian"
        :currency="baseCurrency"
        :month-label="currentMonthLabel"
        @retry="retryDailyExpenses"
      />

      <NetWorthLineCard
        class="analytics-grid__networth"
        :loading="netWorthLoading"
        :error="netWorthError"
        :chart-data="netWorthChartData"
        :empty="!visibleNetWorth.length"
        :currency="baseCurrency"
        @retry="retryNetWorthData"
      />

      <ForecastCard
        class="analytics-grid__forecast"
        :loading="forecastLoading"
        :error="forecastError"
        :forecast="forecastSummary"
        :chart-data="forecastChartData"
        :currency="baseCurrency"
        @retry="retryForecastData"
      />
    </div>
  </PageContainer>
</template>

<style scoped>
.analytics-page {
  display: grid;
  gap: var(--ft-space-6);
}

.analytics-summary {
  display: grid;
  gap: var(--ft-space-3);
}

.analytics-summary__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-3);
}

.analytics-summary__header h3 {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.analytics-summary__meta {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-secondary);
}

.analytics-summary__grid {
  display: grid;
  gap: var(--ft-space-3);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.analytics-grid {
  display: grid;
  gap: var(--ft-space-4);
}

.analytics-grid__hero,
.analytics-grid__pie,
.analytics-grid__spending,
.analytics-grid__delta,
.analytics-grid__patterns,
.analytics-grid__networth,
.analytics-grid__forecast {
  grid-column: 1 / -1;
}

@media (min-width: 1024px) {
  .analytics-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  .analytics-grid__hero,
  .analytics-grid__networth,
  .analytics-grid__forecast {
    grid-column: 1 / -1;
  }

  .analytics-grid__pie {
    grid-column: 1 / span 6;
  }

  .analytics-grid__spending {
    grid-column: 7 / span 6;
  }

  .analytics-grid__delta {
    grid-column: 1 / span 6;
  }

  .analytics-grid__patterns {
    grid-column: 7 / span 6;
  }
}
</style>
