<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '../components/common/PageHeader.vue';
import HeroHealthCard from '../components/analytics/HeroHealthCard.vue';
import SpendingPieCard from '../components/analytics/SpendingPieCard.vue';
import NetWorthLineCard from '../components/analytics/NetWorthLineCard.vue';
import SpendingBarsCard from '../components/analytics/SpendingBarsCard.vue';
import ForecastCard from '../components/analytics/ForecastCard.vue';
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

type FinancialMetricKey = 'savingsRate' | 'liquidityMonths' | 'expenseVolatility' | 'incomeDiversity';

interface MetricDefinition {
  key: FinancialMetricKey;
  format: (value: number | null, currency: string) => string;
  evaluate: (value: number | null) => { status: HealthStatus; score: number } | null;
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
const categoryLoading = ref(false);
const categoryError = ref<string | null>(null);

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
    format: (value, _currency) => formatPercent(value),
    evaluate: (value) => {
      if (value == null) return null;
      if (value >= 0.25) return { status: 'good', score: 90 };
      if (value >= 0.05) return { status: 'average', score: 60 };
      return { status: 'poor', score: 25 };
    },
  },
  {
    key: 'liquidityMonths',
    format: (value, _currency) => formatMonths(value),
    evaluate: (value) => {
      if (value == null) return null;
      if (value >= 6) return { status: 'good', score: 90 };
      if (value >= 3) return { status: 'average', score: 60 };
      return { status: 'poor', score: 25 };
    },
  },
  {
    key: 'expenseVolatility',
    format: (value, _currency) => formatPercent(value),
    evaluate: (value) => {
      if (value == null) return null;
      if (value <= 0.2) return { status: 'good', score: 85 };
      if (value <= 0.45) return { status: 'average', score: 55 };
      return { status: 'poor', score: 20 };
    },
  },
  {
    key: 'incomeDiversity',
    format: (value, _currency) => formatPercent(value != null ? 1 - value : null),
    evaluate: (value) => {
      if (value == null) return null;
      if (value <= 0.4) return { status: 'good', score: 85 };
      if (value <= 0.7) return { status: 'average', score: 55 };
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
  liquidityMonths: {
    label: 'Финансовая подушка',
    tooltip: 'Сколько месяцев вы проживёте на текущие резервы, сохраняя образ жизни.',
    flair: {
      good: { emoji: '🛡️', statusLabel: 'Резерв крепкий' },
      average: { emoji: '🧱', statusLabel: 'Подкопить' },
      poor: { emoji: '⚠️', statusLabel: 'Создайте запас' },
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
  incomeDiversity: {
    label: 'Диверсификация доходов',
    tooltip: 'Насколько равномерно распределены ваши источники дохода.',
    flair: {
      good: { emoji: '🎯', statusLabel: 'Доходы распределены' },
      average: { emoji: '🛶', statusLabel: 'Добавьте источники' },
      poor: { emoji: '🔥', statusLabel: 'Риск потерять доход' },
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

function formatMonths(value: number | null, fractionDigits = 1): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(fractionDigits)} мес`;
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
    const value = metrics[definition.key] ?? null;
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
  try {
    const { from, to } = resolvePeriodRange(periodMonths);
    const data = await apiService.getExpensesByCategoryByDateRange(from, to);
    categoryExpenses.value = data ?? [];
  } catch (error) {
    categoryError.value = resolveErrorMessage(error, 'Не удалось загрузить расходы по категориям.');
    categoryExpenses.value = [];
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
  if (!daily.length || !monthly.length) {
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

  if (currentIndex <= 0) {
    return { summary: null, chartData: null };
  }

  const previous = monthlySorted[currentIndex - 1];
  if (!previous) {
    return { summary: null, chartData: null };
  }
  const baselineLimit = Number(previous.amount ?? 0);
  if (!baselineLimit) {
    return { summary: null, chartData: null };
  }

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

  const baselineData = Array.from({ length: daysInMonth }, () => Number(baselineLimit.toFixed(2)));

  const status: HealthStatus =
    forecastTotal <= baselineLimit * 0.9
      ? 'good'
      : forecastTotal <= baselineLimit * 1.05
        ? 'average'
        : 'poor';

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
      description="Отслеживайте баланс, структуру расходов и прогноз в одном месте"
    />

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

.analytics-grid {
  display: grid;
  gap: var(--ft-space-4);
}

.analytics-grid__hero,
.analytics-grid__pie,
.analytics-grid__spending,
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
}
</style>
