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
import DatePicker from 'primevue/datepicker';
import type {
  CategoryExpenseDto,
  MonthlyExpenseDto,
  NetWorthSnapshotDto,
} from '../types';
import type {
  CategoryLegendItem,
  ExpenseGranularity,
  ForecastSummary,
  HealthStatus,
} from '../types/analytics';
import PageContainer from "@/components/layout/PageContainer.vue";

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

const now = new Date();
const selectedMonth = ref<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
const monthPickerRef = ref<any>(null);

const granularityOptions: Array<{ label: string; value: ExpenseGranularity }> = [
  { label: 'День', value: 'days' },
  { label: 'Неделя', value: 'weeks' },
  { label: 'Месяц', value: 'months' },
] ;
const selectedGranularity = ref<ExpenseGranularity>('days');

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

const healthLoading = computed(() => expensesLoading.days || expensesLoading.months);
const healthError = computed(() => expensesError.days ?? expensesError.months);

const chartPalette = reactive({
  primary: '#60a5fa',
  surface: '#94a3b8',
  accent: '#f97316',
  categories: ['#60a5fa', '#14b8a6', '#a855f7', '#06b6d4', '#fb923c'],
});

const baseCurrency = computed(() => userStore.baseCurrencyCode ?? 'RUB');

const healthTiles = computed<HealthTile[]>(() => {
  const trendText =
    monthOverMonthChange.value == null
      ? 'к прошлому мес. —'
      : `к прошлому мес. ${monthOverMonthChange.value > 0 ? '+' : ''}${monthOverMonthChange.value}%`;
  return [
    {
      key: 'month-total',
      label: 'Всего за месяц',
      value: formatMoney(currentMonthTotal.value),
      meta: trendText,
      tooltip: 'Сумма расходов за текущий месяц.',
    },
    {
      key: 'mean-daily',
      label: 'Средний расход',
      value: formatMoney(dailyMean.value),
      meta: 'включает пиковые дни',
      tooltip: 'Средний дневной расход за месяц.',
    },
    {
      key: 'median-daily',
      label: 'Медианный расход',
      value: formatMoney(dailyMedian.value),
      meta: 'обычный день',
      tooltip: 'Типичный дневной расход за месяц (медиана).',
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

function normalizeMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addLocalMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getMonthRangeUtc(date: Date) {
  const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0));
  return { from: start, to: end };
}

function getMonthRangeLocal(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { from: start, to: end };
}

function formatMonthTitle(date: Date): string {
  const label = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function computeMedian(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

async function loadCategoryExpenses(month: Date) {
  if (categoryLoading.value) return;
  categoryLoading.value = true;
  categoryError.value = null;
  categoryDeltaError.value = null;
  try {
    const { from, to } = getMonthRangeUtc(month);
    const data = await apiService.getExpensesByCategoryByDateRange(from, to);
    categoryExpenses.value = data ?? [];

    try {
      const previousRange = getMonthRangeUtc(addLocalMonths(month, -1));
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

function formatDateQuery(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function handleCategorySelect(category: CategoryLegendItem) {
  const range = getMonthRangeLocal(selectedMonth.value);
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

function handlePeakSummarySelect() {
  if (!peakDays.value.length) return;
  const dates = peakDays.value.map((item) => item.date.getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  void router.push({
    name: 'expenses',
    query: {
      from: formatDateQuery(minDate),
      to: formatDateQuery(maxDate),
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

const normalizedSelectedMonth = computed(() => normalizeMonth(selectedMonth.value));

const selectedMonthLabel = computed(() => formatMonthTitle(normalizedSelectedMonth.value));

const canNavigateNext = computed(() => {
  const now = normalizeMonth(new Date());
  return normalizedSelectedMonth.value < now;
});

const maxMonthDate = computed(() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
});

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

const selectedMonthEntry = computed(() => {
  const target = normalizedSelectedMonth.value;
  return monthlySortedExpenses.value.find(
    (entry) => entry.year === target.getFullYear() && entry.month === target.getMonth() + 1
  ) ?? null;
});

const previousMonthEntry = computed(() => {
  const previous = addLocalMonths(normalizedSelectedMonth.value, -1);
  return monthlySortedExpenses.value.find(
    (entry) => entry.year === previous.getFullYear() && entry.month === previous.getMonth() + 1
  ) ?? null;
});

const currentMonthDaily = computed(() => {
  const target = normalizedSelectedMonth.value;
  return expensesData.days.filter(
    (entry) => entry.year === target.getFullYear() && entry.month === target.getMonth() + 1
  );
});

const selectedMonthShortLabel = computed(() => {
  const target = normalizedSelectedMonth.value;
  return formatMonthLabel(target.getFullYear(), target.getMonth() + 1);
});

const currentMonthLabel = computed(() => selectedMonthShortLabel.value);

const currentMonthTotal = computed(() => {
  const dailyTotal = currentMonthDaily.value.reduce(
    (sum, entry) => sum + Number(entry.amount ?? 0),
    0
  );
  const fallback = selectedMonthEntry.value?.amount;
  if (fallback != null) return Number(fallback);
  return dailyTotal > 0 ? dailyTotal : null;
});

const monthOverMonthChange = computed(() => {
  const current = selectedMonthEntry.value?.amount;
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
  const selectedBase = normalizedSelectedMonth.value;
  const isCurrentMonth =
    selectedBase.getFullYear() === now.getFullYear() && selectedBase.getMonth() === now.getMonth();
  const endUtc = isCurrentMonth
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    : new Date(Date.UTC(selectedBase.getFullYear(), selectedBase.getMonth() + 1, 0));
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
      shareValue: null,
      monthLabel: '—',
    };
  }
  const share = (total / monthTotal) * 100;
  return {
    count,
    totalLabel: formatMoney(total),
    shareLabel: `${share.toFixed(1)}%`,
    shareValue: share,
    monthLabel: formatMoney(monthTotal),
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
  const target = normalizedSelectedMonth.value;
  const filtered = items.filter(
    (entry) => entry.year === target.getFullYear() && entry.month === target.getMonth() + 1
  );

  if (granularity === 'months') {
    return filtered;
  }

  const sorted = [...filtered].sort((a, b) => {
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
    const range = getIsoWeekRange(entry.year, entry.week);
    const startLabel = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(range.start);
    const endLabel = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(range.end);
    return `${startLabel} — ${endLabel}`;
  }

  return formatMonthLabel(entry.year, entry.month);
}

function getIsoWeekRange(year: number, week: number) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay();
  const isoWeekStart = new Date(simple);
  const diff = dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek;
  isoWeekStart.setUTCDate(simple.getUTCDate() + diff);
  const isoWeekEnd = new Date(isoWeekStart);
  isoWeekEnd.setUTCDate(isoWeekStart.getUTCDate() + 6);
  return {
    start: new Date(isoWeekStart.getUTCFullYear(), isoWeekStart.getUTCMonth(), isoWeekStart.getUTCDate()),
    end: new Date(isoWeekEnd.getUTCFullYear(), isoWeekEnd.getUTCMonth(), isoWeekEnd.getUTCDate()),
  };
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
  const selectedBase = normalizedSelectedMonth.value;
  const currentYear = selectedBase.getFullYear();
  const currentMonth = selectedBase.getMonth() + 1;
  const isCurrentMonth =
    selectedBase.getFullYear() === now.getFullYear() && selectedBase.getMonth() === now.getMonth();
  const today = isCurrentMonth ? now.getUTCDate() : new Date(currentYear, currentMonth, 0).getDate();
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
  void Promise.all([loadExpenses('months', true), loadExpenses('days', true)]);
}

function retryCategories() {
  void loadCategoryExpenses(normalizedSelectedMonth.value);
}

function retryExpensesData() {
  void loadExpenses(selectedGranularity.value, true);
}

function retryForecastData() {
  void Promise.all([loadExpenses('months', true), loadExpenses('days', true)]);
}

const updateSelectedMonth = (value: Date | null) => {
  if (!value) return;
  selectedMonth.value = normalizeMonth(value);
};

const openMonthPicker = () => {
  monthPickerRef.value?.show?.();
};

const goToPreviousMonth = () => {
  selectedMonth.value = addLocalMonths(normalizedSelectedMonth.value, -1);
};

const goToNextMonth = () => {
  if (!canNavigateNext.value) return;
  selectedMonth.value = addLocalMonths(normalizedSelectedMonth.value, 1);
};

watch(selectedGranularity, (granularity) => {
  if (granularity) {
    void loadExpenses(granularity);
  }
});

watch(selectedMonth, (value) => {
  if (!value) return;
  void loadCategoryExpenses(normalizeMonth(value));
});

onMounted(async () => {
  resolveCssVariables();
  await userStore.fetchCurrentUser();
  await Promise.all([
    loadCategoryExpenses(normalizedSelectedMonth.value),
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
    >
      <template #actions>
        <div class="analytics-month-selector">
          <button
            type="button"
            class="analytics-month-selector__button"
            aria-label="Предыдущий месяц"
            @click="goToPreviousMonth"
          >
            <i class="pi pi-chevron-left" />
          </button>
          <button
            type="button"
            class="analytics-month-selector__label"
            @click="openMonthPicker"
          >
            {{ selectedMonthLabel }}
          </button>
          <button
            type="button"
            class="analytics-month-selector__button"
            aria-label="Следующий месяц"
            :disabled="!canNavigateNext"
            @click="goToNextMonth"
          >
            <i class="pi pi-chevron-right" />
          </button>
          <DatePicker
            ref="monthPickerRef"
            :model-value="selectedMonth"
            view="month"
            date-format="MM yy"
            :manual-input="false"
            :max-date="maxMonthDate"
            class="analytics-month-selector__picker"
            @update:model-value="updateSelectedMonth"
          />
        </div>
      </template>
    </PageHeader>

    <div class="analytics-grid">
      <HeroHealthCard
        class="analytics-grid__hero"
        :loading="healthLoading"
        :error="healthError"
        :tiles="healthTiles"
        :peaks="peakDays"
        :peaks-summary="peakSummary"
        :month-label="currentMonthLabel"
        @retry="retryHealth"
        @select-peak="handlePeakSelect"
        @select-peak-summary="handlePeakSummarySelect"
      />

      <SpendingPieCard
        class="analytics-grid__pie"
        :loading="categoryLoading"
        :error="categoryError"
        :chart-data="categoryChartData"
        :legend="categoryLegend"
        :currency="baseCurrency"
        @retry="retryCategories"
        @select-category="handleCategorySelect"
      />

      <CategoryDeltaCard
        class="analytics-grid__delta"
        :loading="categoryLoading"
        :error="categoryDeltaError"
        :period-label="selectedMonthLabel"
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

.analytics-month-selector {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ft-border-subtle) 70%, transparent);
  background: color-mix(in srgb, var(--ft-surface-raised) 85%, transparent);
}

.analytics-month-selector button {
  flex: 0 0 auto;
}

.analytics-month-selector__button {
  border: none;
  background: transparent;
  color: var(--ft-text-secondary);
  font-size: 0.9rem;
  padding: 0.2rem;
  border-radius: 999px;
  cursor: pointer;
  transition: color var(--ft-transition-fast), background-color var(--ft-transition-fast);
}

.analytics-month-selector__button:hover:not(:disabled) {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-surface-base) 70%, transparent);
}

.analytics-month-selector__button:disabled {
  opacity: 0.4;
  cursor: default;
}

.analytics-month-selector__label {
  border: none;
  background: transparent;
  color: var(--ft-text-primary);
  font-weight: var(--ft-font-semibold);
  font-size: var(--ft-text-sm);
  padding: 0.2rem 0.35rem;
  cursor: pointer;
  white-space: nowrap;
}

.analytics-month-selector__picker {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
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
    grid-column: 1 / span 8;
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
