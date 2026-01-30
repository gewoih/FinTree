<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '../components/common/PageHeader.vue';
import HeroHealthCard from '../components/analytics/HeroHealthCard.vue';
import SpendingPieCard from '../components/analytics/SpendingPieCard.vue';
import SpendingBarsCard from '../components/analytics/SpendingBarsCard.vue';
import ForecastCard from '../components/analytics/ForecastCard.vue';
import CategoryDeltaCard from '../components/analytics/CategoryDeltaCard.vue';
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

interface HealthTile {
  key: string;
  label: string;
  value: string;
  meta?: string | null;
  tooltip?: string;
  status?: HealthStatus | 'neutral';
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
  amountLabel: string;
  date: Date;
  shareLabel: string;
}

const userStore = useUserStore();
const router = useRouter();

const healthPeriodOptions: Array<{ label: string; value: number }> = [
  { label: '1 месяц', value: 1 },
  { label: '3 месяца', value: 3 },
  { label: '6 месяцев', value: 6 },
  { label: '12 месяцев', value: 12 },
];
const selectedHealthPeriod = ref<number>(6);

const categoryPeriodOptions: Array<{ label: string; value: number }> = [
  { label: '1м', value: 1 },
  { label: '3м', value: 3 },
  { label: '6м', value: 6 },
  { label: '12м', value: 12 },
];
const selectedCategoryPeriod = ref<number>(1);

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

const scoreMetricDefinitions: MetricDefinition[] = [
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

const healthTiles = computed<HealthTile[]>(() => {
  const trendText =
    monthOverMonthChange.value == null
      ? 'к прошлому мес. —'
      : `к прошлому мес. ${monthOverMonthChange.value > 0 ? '+' : ''}${monthOverMonthChange.value}%`;
  const esrValue = meanMedianRatio.value;
  const esrStatus: HealthTile['status'] =
    esrValue == null
      ? 'neutral'
      : esrValue <= 1.3
        ? 'good'
        : esrValue <= 1.8
          ? 'average'
          : 'poor';
  const esrLabel = esrValue == null ? '—' : `${esrValue.toFixed(2)}×`;

  return [
    {
      key: 'month-total',
      label: 'Всего за месяц',
      value: formatMoney(currentMonthTotal.value),
      meta: trendText,
      tooltip: 'Сумма расходов за текущий месяц.',
    },
    {
      key: 'median-daily',
      label: 'Медианный расход',
      value: formatMoney(dailyMedian.value),
      tooltip: 'Типичный дневной расход за месяц (медиана).',
    },
    {
      key: 'mean-daily',
      label: 'Средний расход',
      value: formatMoney(dailyMean.value),
      tooltip: 'Средний дневной расход за месяц.',
    },
    {
      key: 'event-skew',
      label: 'Индекс событийности',
      value: esrLabel,
      tooltip:
        'Показывает, насколько событийные траты влияют на финансовую картину. Чем выше, тем больше вклад редких крупных событий.',
      status: esrStatus,
    },
  ];
});

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

const financialScore = computed(() => {
  const metrics = financialMetrics.value;
  if (!metrics) return null;
  const evaluations = scoreMetricDefinitions
    .map((definition) => definition.evaluate(definition.getValue(metrics)))
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

function resolveTransactionsPeriodRange(months: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1 - months, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: start, to: end };
}

function formatDateQuery(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function handleCategorySelect(category: CategoryLegendItem) {
  const range = resolveTransactionsPeriodRange(selectedCategoryPeriod.value);
  void router.push({
    name: 'expenses',
    query: {
      categoryId: category.id,
      from: formatDateQuery(range.from),
      to: formatDateQuery(range.to),
    },
  });
}

function handlePeakSelect(peak: PeakDayItem) {
  void router.push({
    name: 'expenses',
    query: {
      from: formatDateQuery(peak.date),
      to: formatDateQuery(peak.date),
    },
  });
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

const monthOverMonthChange = computed(() => {
  const current = currentMonthEntry.value?.amount;
  const previous = previousMonthEntry.value?.amount;
  if (current == null || previous == null || Number(previous) === 0) return null;
  return Number((((Number(current) - Number(previous)) / Number(previous)) * 100).toFixed(1));
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

const forecastDailyMedian = computed(() => {
  const daily = expensesData.days;
  if (!daily.length) return null;

  const now = new Date();
  const endUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startUtc = new Date(endUtc);
  startUtc.setUTCDate(endUtc.getUTCDate() - 89);

  const sumsByDay = new Map<string, number>();
  for (const entry of daily) {
    if (entry.day == null) continue;
    const entryDateUtc = new Date(Date.UTC(entry.year, entry.month - 1, entry.day));
    if (entryDateUtc < startUtc || entryDateUtc > endUtc) continue;
    const key = entryDateUtc.toISOString().slice(0, 10);
    sumsByDay.set(key, (sumsByDay.get(key) ?? 0) + Number(entry.amount ?? 0));
  }

  const values = [...sumsByDay.values()].filter((value) => value > 0);
  return computeMedian(values);
});

const meanMedianRatio = computed(() => {
  if (dailyMean.value == null || dailyMedian.value == null || dailyMedian.value === 0) {
    return null;
  }
  return dailyMean.value / dailyMedian.value;
});

const peakDays = computed<PeakDayItem[]>(() => {
  if (!currentMonthDaily.value.length || dailyMedian.value == null) return [];
  const threshold = dailyMedian.value * 2;
  const monthTotal = currentMonthTotal.value ?? 0;
  return [...currentMonthDaily.value]
    .filter((entry) => entry.day != null && Number(entry.amount ?? 0) >= threshold)
    .sort((a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0))
    .map((entry) => {
      const date = new Date(entry.year, entry.month - 1, entry.day ?? 1);
      const amount = Number(entry.amount ?? 0);
      const share = monthTotal > 0 ? (amount / monthTotal) * 100 : null;
      return {
        label: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date),
        amount,
        amountLabel: formatMoney(amount),
        shareLabel: share == null ? '—' : `${share.toFixed(1)}%`,
        date,
      };
    });
});

const peakSummary = computed(() => {
  const count = peakDays.value.length;
  const total = peakDays.value.reduce((sum, item) => sum + item.amount, 0);
  const monthTotal = currentMonthTotal.value;
  if (!monthTotal) {
    return {
      count,
      totalLabel: '—',
      shareLabel: '—',
    };
  }
  const share = (total / monthTotal) * 100;
  return {
    count,
    totalLabel: formatMoney(total),
    shareLabel: `${share.toFixed(1)}%`,
  };
});

const sortedNetWorth = computed(() => {
  return [...netWorthSnapshots.value].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
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
  const medianDaily = forecastDailyMedian.value;
  if (medianDaily == null) {
    return { summary: null, chartData: null };
  }
  const forecastTotal = medianDaily * daysInMonth;

  const forecastData = Array.from({ length: daysInMonth }, (_, index) =>
    Number((medianDaily * (index + 1)).toFixed(2)),
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

function retryExpensesData() {
  void loadExpenses(selectedGranularity.value, true);
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
    />

    <div class="analytics-grid">
      <HeroHealthCard
        class="analytics-grid__hero"
        :loading="healthLoading"
        :error="healthError"
        :score="financialScore"
        :verdict="financialVerdict"
        :tiles="healthTiles"
        :peaks="peakDays"
        :peaks-summary="peakSummary"
        :month-label="currentMonthLabel"
        :period="selectedHealthPeriod"
        :period-options="healthPeriodOptions"
        @retry="retryHealth"
        @update:period="selectedHealthPeriod = $event"
        @select-peak="handlePeakSelect"
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
        @select-category="handleCategorySelect"
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

.analytics-grid {
  display: grid;
  gap: var(--ft-space-4);
}

.analytics-grid__hero,
.analytics-grid__pie,
.analytics-grid__spending,
.analytics-grid__delta,
.analytics-grid__forecast {
  grid-column: 1 / -1;
}

@media (min-width: 1024px) {
  .analytics-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  .analytics-grid__hero,
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

  .analytics-grid__spending {
    grid-column: 7 / span 6;
  }

}
</style>
