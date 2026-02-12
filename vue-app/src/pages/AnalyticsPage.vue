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
import { useFinanceStore } from '../stores/finance';
import { apiService } from '../services/api.service';
import DatePicker from 'primevue/datepicker';
import type {
  AnalyticsDashboardDto,
  MonthlyExpenseDto,
} from '../types';
import type {
  CategoryLegendItem,
  ExpenseGranularity,
  ForecastSummary,
} from '../types/analytics';
import PageContainer from '../components/layout/PageContainer.vue';

interface HealthTile {
  key: string;
  label: string;
  value: string;
  meta?: string | null;
  tooltip?: string;
  icon: string;
  accent?: MetricAccent;
}

interface HealthGroup {
  key: string;
  title: string;
  metrics: HealthTile[];
  accent?: MetricAccent;
}

interface PeakDayItem {
  label: string;
  amount: number;
  amountLabel: string;
  date: Date;
  shareLabel: string;
}

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  actionLabel?: string;
  actionTo?: string;
}

type MetricAccent = 'good' | 'average' | 'poor' | 'neutral' | 'income' | 'expense';
type MonthPickerInstance = {
  show?: () => void;
  hide?: () => void;
};

const userStore = useUserStore();
const financeStore = useFinanceStore();
const router = useRouter();

const now = new Date();
const selectedMonth = ref<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
const monthPickerRef = ref<MonthPickerInstance | null>(null);

const granularityOptions: Array<{ label: string; value: ExpenseGranularity }> = [
  { label: 'День', value: 'days' },
  { label: 'Неделя', value: 'weeks' },
  { label: 'Месяц', value: 'months' },
] ;
const selectedGranularity = ref<ExpenseGranularity>('days');

const dashboard = ref<AnalyticsDashboardDto | null>(null);
const dashboardLoading = ref(false);
const dashboardError = ref<string | null>(null);
const dashboardRequestId = ref(0);

const healthLoading = computed(() => dashboardLoading.value);
const healthError = computed(() => dashboardError.value);
const categoryLoading = computed(() => dashboardLoading.value);
const categoryError = computed(() => dashboardError.value);
const categoryDeltaError = computed(() => dashboardError.value);
const forecastLoading = computed(() => dashboardLoading.value);
const forecastError = computed(() => dashboardError.value);

const chartPalette = reactive({
  primary: '#2e5bff',
  surface: '#283449',
  accent: '#0ea5e9',
  pointBorder: '#0b111a',
  categories: ['#2e5bff', '#0ea5e9', '#22c55e', '#a855f7', '#f59e0b'],
});

const baseCurrency = computed(() => userStore.baseCurrencyCode ?? 'RUB');

const hasAccounts = computed(() => financeStore.accounts.length > 0);
const hasMainAccount = computed(() => financeStore.accounts.some(account => account.isMain));
const isTelegramLinked = computed(() => Boolean(userStore.currentUser?.telegramUserId));
const hasTransactions = computed(() => {
  if (!dashboard.value) return false;
  const hasCategories = (dashboard.value.categories?.items?.length ?? 0) > 0;
  const hasSpending = (dashboard.value.spending?.days ?? []).some(item => item.amount > 0);
  return hasCategories || hasSpending;
});

const onboardingSteps = computed<OnboardingStep[]>(() => [
  {
    key: 'account',
    title: hasAccounts.value ? 'Выберите основной счёт' : 'Создайте первый счёт',
    description: hasAccounts.value
      ? 'Основной счёт нужен боту для записи расходов.'
      : 'Добавьте счёт, чтобы фиксировать траты и доходы.',
    completed: hasMainAccount.value,
    actionLabel: 'Открыть счета',
    actionTo: '/accounts',
  },
  {
    key: 'telegram',
    title: 'Привяжите Telegram',
    description: 'Отправьте `/id` боту @financetree_bot и вставьте цифры в профиль.',
    completed: isTelegramLinked.value,
    actionLabel: 'Открыть профиль',
    actionTo: '/profile#telegram',
  },
  {
    key: 'transactions',
    title: 'Добавьте первые операции',
    description: 'Пишите траты в бота @financetree_bot или добавьте вручную.',
    completed: hasTransactions.value,
    actionLabel: 'Открыть транзакции',
    actionTo: '/expenses',
  },
]);

const showOnboarding = computed(() => onboardingSteps.value.some(step => !step.completed));
const completedOnboardingCount = computed(
  () => onboardingSteps.value.filter(step => step.completed).length
);

const healthGroups = computed<HealthGroup[]>(() => {
  const health = dashboard.value?.health;
  const savingsStatus = resolveSavingsStatus(health?.savingsRate ?? null);
  const cashflowStatus = resolveCashflowStatus(
    health?.netCashflow ?? null,
    health?.monthIncome ?? null
  );
  const typicalStatus = resolveMeanMedianStatus(health?.meanMedianRatio ?? null);
  const discretionaryStatus = resolveDiscretionaryStatus(health?.discretionarySharePercent ?? null);
  const liquidityStatus = resolveLiquidityStatus(health?.liquidMonthsStatus ?? null);

  return [
    {
      key: 'month-total',
      title: 'Итог месяца',
      metrics: [
        {
          key: 'income',
          label: 'Доход за месяц',
          value: formatMoney(health?.monthIncome ?? null),
          tooltip: 'Все поступления за выбранный месяц.',
          icon: 'pi pi-plus-circle',
          accent: 'income',
        },
        {
          key: 'expense',
          label: 'Расходы за месяц',
          value: formatMoney(health?.monthTotal ?? null),
          tooltip: 'Все расходы за выбранный месяц.',
          icon: 'pi pi-minus-circle',
          accent: 'expense',
        },
      ],
    },
    {
      key: 'savings',
      title: 'Сбережения',
      accent: savingsStatus,
      metrics: [
        {
          key: 'savings-rate',
          label: 'Доля сбережений',
          value: health?.savingsRate == null ? '—' : formatPercent(health.savingsRate, 1),
          tooltip: 'Часть дохода, которая осталась после расходов.',
          icon: 'pi pi-percentage',
          accent: savingsStatus,
        },
        {
          key: 'net-cashflow',
          label: 'Чистый поток',
          value: formatSignedMoney(health?.netCashflow ?? null),
          tooltip: 'Доходы минус расходы за месяц.',
          icon: 'pi pi-wallet',
          accent: cashflowStatus,
        },
      ],
    },
    {
      key: 'liquidity',
      title: 'Ликвидность',
      accent: liquidityStatus,
      metrics: [
        {
          key: 'liquid-months',
          label: 'Ликвидные месяцы',
          value: health?.liquidMonths == null ? '—' : `${health.liquidMonths.toFixed(1)} мес.`,
          tooltip: 'Ликвидные активы / медианный расход в день с расходами × среднее число таких дней в месяц (за 6 мес.).',
          icon: 'pi pi-shield',
          accent: liquidityStatus,
        },
        {
          key: 'liquid-assets',
          label: 'Ликвидные активы',
          value: formatMoney(health?.liquidAssets ?? null),
          tooltip: 'Сумма средств на счетах, отмеченных как ликвидные.',
          icon: 'pi pi-bolt',
          accent: liquidityStatus,
        },
      ],
    },
    {
      key: 'typical',
      title: 'Типичный день',
      accent: typicalStatus,
      metrics: [
        {
          key: 'mean-daily',
          label: 'Средний расход/день',
          value: formatMoney(health?.meanDaily ?? null),
          tooltip: 'Среднее значение дневных расходов за месяц.',
          icon: 'pi pi-chart-line',
        },
        {
          key: 'median-daily',
          label: 'Медианный расход/день',
          value: formatMoney(health?.medianDaily ?? null),
          tooltip: 'Медиана дневных расходов за месяц — «обычный» день.',
          icon: 'pi pi-chart-bar',
        },
        {
          key: 'std-median',
          label: 'Средний / медианный',
          value: formatRatio(health?.meanMedianRatio ?? null),
          tooltip: 'Показывает, насколько пики трат поднимают среднее. Чем больше, тем «событийнее» расходы.',
          icon: 'pi pi-sliders-h',
          accent: typicalStatus,
        },
      ],
    },
    {
      key: 'discretionary',
      title: 'Необязательные',
      accent: discretionaryStatus,
      metrics: [
        {
          key: 'discretionary-total',
          label: 'Сумма необязательных',
          value: formatMoney(health?.discretionaryTotal ?? null),
          tooltip: 'Расходы по необязательным категориям за месяц.',
          icon: 'pi pi-shopping-bag',
          accent: discretionaryStatus,
        },
        {
          key: 'discretionary-share',
          label: 'Доля необязательных',
          value: formatPercentValue(health?.discretionarySharePercent ?? null),
          tooltip: 'Часть всех расходов, которая пришлась на необязательные категории.',
          icon: 'pi pi-percentage',
          accent: discretionaryStatus,
        },
      ],
    },
  ];
});

function resolveCssVariables() {
  if (typeof window === 'undefined') return;
  const styles = getComputedStyle(document.documentElement);
  chartPalette.primary = styles.getPropertyValue('--ft-primary-400').trim() || chartPalette.primary;
  chartPalette.surface = styles.getPropertyValue('--ft-border-default').trim() || chartPalette.surface;
  chartPalette.accent = styles.getPropertyValue('--ft-info-400').trim() || chartPalette.accent;
  chartPalette.pointBorder = styles.getPropertyValue('--ft-surface-base').trim() || chartPalette.pointBorder;
  const fallback = [
    styles.getPropertyValue('--ft-primary-400').trim(),
    styles.getPropertyValue('--ft-info-400').trim(),
    styles.getPropertyValue('--ft-success-400').trim(),
    styles.getPropertyValue('--ft-warning-400').trim(),
    styles.getPropertyValue('--ft-danger-400').trim(),
  ].filter(Boolean);
  if (fallback.length) {
    chartPalette.categories = fallback;
  }
}

function formatPercent(value: number | null, fractionDigits = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

function formatPercentValue(value: number | null, fractionDigits = 1): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(fractionDigits)}%`;
}

function formatMoney(value: number | null, maximumFractionDigits = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: baseCurrency.value,
    maximumFractionDigits,
  });
}

function formatSignedMoney(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value < 0 ? '−' : '+';
  return `${sign} ${formatMoney(Math.abs(value))}`;
}

function formatRatio(value: number | null, fractionDigits = 2): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(fractionDigits)}×`;
}

function resolveSavingsStatus(value: number | null): MetricAccent {
  if (value == null || Number.isNaN(value)) return 'neutral';
  if (value >= 0.2) return 'good';
  if (value >= 0.1) return 'average';
  return 'poor';
}

function resolveCashflowStatus(netCashflow: number | null, monthIncome: number | null): MetricAccent {
  if (netCashflow == null || Number.isNaN(netCashflow)) return 'neutral';
  if (monthIncome == null || Number.isNaN(monthIncome) || monthIncome <= 0) {
    return netCashflow >= 0 ? 'good' : 'poor';
  }

  const ratio = netCashflow / monthIncome;
  if (ratio >= 0.1) return 'good';
  if (ratio >= 0) return 'average';
  return 'poor';
}

function resolveDiscretionaryStatus(value: number | null): MetricAccent {
  if (value == null || Number.isNaN(value)) return 'neutral';
  if (value <= 25) return 'good';
  if (value <= 45) return 'average';
  return 'poor';
}

function resolveMeanMedianStatus(value: number | null): MetricAccent {
  if (value == null || Number.isNaN(value)) return 'neutral';
  if (value <= 1.3) return 'good';
  if (value <= 1.8) return 'average';
  return 'poor';
}

function resolveLiquidityStatus(status: string | null): MetricAccent {
  if (!status) return 'neutral';
  if (status === 'good') return 'good';
  if (status === 'average') return 'average';
  if (status === 'poor') return 'poor';
  return 'neutral';
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

function getMonthRangeLocal(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { from: start, to: end };
}

function formatMonthTitle(date: Date): string {
  const label = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date);
  const cleaned = label.replace(/\s*г\.$/i, '');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

async function loadDashboard(month: Date) {
  const requestId = ++dashboardRequestId.value;
  dashboardLoading.value = true;
  dashboardError.value = null;
  try {
    const year = month.getFullYear();
    const apiMonth = month.getMonth() + 1;
    const data = await apiService.getAnalyticsDashboard(year, apiMonth);
    if (requestId !== dashboardRequestId.value) return;
    dashboard.value = data;
  } catch (error) {
    if (requestId !== dashboardRequestId.value) return;
    dashboardError.value = resolveErrorMessage(error, 'Не удалось загрузить аналитику.');
    dashboard.value = null;
  } finally {
    if (requestId === dashboardRequestId.value) {
      dashboardLoading.value = false;
    }
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


const categoryLegend = computed<CategoryLegendItem[]>(() => {
  const items = dashboard.value?.categories.items ?? [];
  if (!items.length) return [];
  return items.map((item, index) => ({
    id: item.id,
    name: item.name,
    amount: Number(item.amount ?? 0),
    percent: Number(item.percent ?? 0),
    color: item.color?.trim() ?? chartPalette.categories[index % chartPalette.categories.length],
    isMandatory: item.isMandatory ?? false,
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

const categoryDelta = computed(() => {
  const delta = dashboard.value?.categories.delta;
  return {
    increased: delta?.increased ?? [],
    decreased: delta?.decreased ?? [],
  };
});

const peakDays = computed<PeakDayItem[]>(() => {
  const items = dashboard.value?.peakDays ?? [];
  if (!items.length) return [];
  return items.map((item) => {
    const date = new Date(item.year, item.month - 1, item.day);
    const amount = Number(item.amount ?? 0);
    return {
      label: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date),
      amount,
      amountLabel: formatMoney(amount),
      shareLabel: formatPercentValue(item.sharePercent ?? null),
      date,
    };
  });
});

const peakSummary = computed(() => {
  const peaks = dashboard.value?.peaks;
  if (!peaks) {
    return {
      count: 0,
      totalLabel: '—',
      shareLabel: '—',
      shareValue: null,
      monthLabel: '—',
    };
  }

  const hasMonthTotal = peaks.monthTotal != null && peaks.monthTotal > 0;
  const shareValue = peaks.sharePercent ?? null;

  return {
    count: peaks.count,
    totalLabel: hasMonthTotal ? formatMoney(Number(peaks.total ?? 0)) : '—',
    shareLabel: formatPercentValue(shareValue),
    shareValue,
    monthLabel: hasMonthTotal ? formatMoney(Number(peaks.monthTotal ?? 0)) : '—',
  };
});

function formatMonthLabel(year: number, month: number): string {
  const formatter = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric' });
  return formatter.format(new Date(year, month - 1, 1));
}

function extractRgb(color: string): string {
  if (typeof document === 'undefined') {
    return '46,91,255';
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '46,91,255';
  ctx.fillStyle = color;
  const computed = ctx.fillStyle as string;
  const rgbMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return `${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]}`;
  }
  const match = computed.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match || !match[1] || !match[2] || !match[3]) return '46,91,255';
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `${r},${g},${b}`;
}

const expensesChartData = computed(() => {
  const data = getSortedExpenses(selectedGranularity.value);
  if (!data.length) return null;
  const total = data.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  if (total <= 0) return null;
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
  const items = dashboard.value?.spending?.[granularity] ?? [];
  const sorted = [...items].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    if (granularity === 'days') return (a.day ?? 0) - (b.day ?? 0);
    if (granularity === 'weeks') return (a.week ?? 0) - (b.week ?? 0);
    return 0;
  });

  return sorted;
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

const forecastSummary = computed<ForecastSummary | null>(() => {
  const summary = dashboard.value?.forecast.summary;
  return summary ?? null;
});

const forecastChartData = computed(() => {
  const series = dashboard.value?.forecast.series;
  if (!series || !series.days.length) return null;

  const labels = series.days.map((day) => day.toString());
  const baselineValue = series.baseline ?? dashboard.value?.forecast.summary.baselineLimit ?? null;
  const hasBaseline = baselineValue != null;
  const baselineData = hasBaseline ? series.days.map(() => baselineValue) : [];

  return {
    labels,
    datasets: [
      {
        label: 'Факт',
        data: series.actual,
        borderColor: chartPalette.accent,
        backgroundColor: `rgba(${extractRgb(chartPalette.accent)}, 0.18)`,
        fill: true,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: chartPalette.accent,
        pointBorderColor: chartPalette.pointBorder,
        spanGaps: false,
      },
      {
        label: 'Прогноз',
        data: series.forecast,
        borderColor: chartPalette.primary,
        borderDash: [8, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.25,
      },
      ...(hasBaseline
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
});

function retryDashboard() {
  void loadDashboard(normalizedSelectedMonth.value);
}

const updateSelectedMonth = (value: Date | Date[] | (Date | null)[] | null | undefined) => {
  if (!value || Array.isArray(value)) return;
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

watch(selectedMonth, (value) => {
  if (!value) return;
  const normalized = normalizeMonth(value);
  void loadDashboard(normalized);
});

onMounted(async () => {
  resolveCssVariables();
  await userStore.fetchCurrentUser();
  await Promise.all([
    loadDashboard(normalizedSelectedMonth.value),
    financeStore.fetchAccounts(),
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

    <AppCard
      v-if="showOnboarding"
      class="onboarding-card"
      variant="muted"
      padding="lg"
      elevated
    >
      <div class="onboarding-card__header">
        <div>
          <h2>Быстрый старт</h2>
          <p>Выполните несколько шагов и получите первые инсайты.</p>
        </div>
        <div class="onboarding-card__progress">
          {{ completedOnboardingCount }} / {{ onboardingSteps.length }}
        </div>
      </div>

      <div class="onboarding-card__steps">
        <div
          v-for="step in onboardingSteps"
          :key="step.key"
          class="onboarding-card__step"
          :class="{ 'onboarding-card__step--done': step.completed }"
        >
          <div class="onboarding-card__status">
            <i :class="['pi', step.completed ? 'pi-check' : 'pi-circle-on']" />
          </div>
          <div class="onboarding-card__info">
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </div>
          <UiButton
            v-if="!step.completed && step.actionTo"
            :label="step.actionLabel"
            size="sm"
            variant="secondary"
            @click="router.push(step.actionTo)"
          />
        </div>
      </div>
    </AppCard>

    <div class="analytics-grid">
      <HeroHealthCard
        class="analytics-grid__item analytics-grid__item--span-12"
        :loading="healthLoading"
        :error="healthError"
        :groups="healthGroups"
        :peaks="peakDays"
        :peaks-summary="peakSummary"
        @retry="retryDashboard"
        @select-peak="handlePeakSelect"
        @select-peak-summary="handlePeakSummarySelect"
      />

      <SpendingPieCard
        class="analytics-grid__item analytics-grid__item--span-12"
        :loading="categoryLoading"
        :error="categoryError"
        :chart-data="categoryChartData"
        :legend="categoryLegend"
        :currency="baseCurrency"
        @retry="retryDashboard"
        @select-category="handleCategorySelect"
      />

      <CategoryDeltaCard
        class="analytics-grid__item analytics-grid__item--span-6"
        :loading="categoryLoading"
        :error="categoryDeltaError"
        :period-label="selectedMonthLabel"
        :increased="categoryDelta.increased"
        :decreased="categoryDelta.decreased"
        :currency="baseCurrency"
        @retry="retryDashboard"
      />

      <SpendingBarsCard
        class="analytics-grid__item analytics-grid__item--span-6"
        :loading="dashboardLoading"
        :error="dashboardError"
        :granularity="selectedGranularity"
        :granularity-options="granularityOptions"
        :chart-data="expensesChartData"
        :empty="!expensesChartData"
        :currency="baseCurrency"
        @update:granularity="selectedGranularity = $event"
        @retry="retryDashboard"
      />

      <ForecastCard
        class="analytics-grid__item analytics-grid__item--span-12"
        :loading="forecastLoading"
        :error="forecastError"
        :forecast="forecastSummary"
        :chart-data="forecastChartData"
        :currency="baseCurrency"
        @retry="retryDashboard"
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

.analytics-grid__item {
  grid-column: span 12;
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

@media (max-width: 640px) {
  .analytics-month-selector {
    width: 100%;
    justify-content: space-between;
  }

  .analytics-month-selector__label {
    flex: 1;
    text-align: center;
  }
}

@media (min-width: 1024px) {
  .analytics-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

.analytics-grid__item--span-12 {
  grid-column: 1 / -1;
}

.onboarding-card {
  display: grid;
  gap: var(--ft-space-4);
  border: 1px solid var(--ft-border-subtle);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-500) 20%, transparent),
    color-mix(in srgb, var(--ft-info-500) 10%, transparent)
  );
}

.onboarding-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ft-space-4);
}

.onboarding-card__header h2 {
  margin: 0;
  font-size: var(--ft-text-lg);
  color: var(--ft-text-primary);
}

.onboarding-card__header p {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-secondary);
}

.onboarding-card__progress {
  padding: var(--ft-space-2) var(--ft-space-3);
  border-radius: var(--ft-radius-full);
  background: color-mix(in srgb, var(--ft-primary-500) 55%, transparent);
  color: var(--ft-text-inverse);
  font-weight: var(--ft-font-semibold);
}

.onboarding-card__steps {
  display: grid;
  gap: var(--ft-space-3);
}

.onboarding-card__step {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--ft-space-3);
  padding: var(--ft-space-3);
  border-radius: var(--ft-radius-lg);
  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
}

.onboarding-card__step--done {
  opacity: 0.7;
}

.onboarding-card__status {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--ft-primary-500) 55%, transparent);
  color: var(--ft-text-inverse);
  font-size: 1rem;
}

.onboarding-card__step--done .onboarding-card__status {
  background: rgba(16, 185, 129, 0.2);
  color: var(--ft-success-400);
}

.onboarding-card__info h3 {
  margin: 0;
  font-size: var(--ft-text-base);
  color: var(--ft-text-primary);
}

.onboarding-card__info p {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-sm);
}

@media (max-width: 640px) {
  .onboarding-card__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .onboarding-card__step {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
  }

  .onboarding-card__step :deep(.ui-button) {
    grid-column: 1 / -1;
  }
}

  .analytics-grid__item--span-8 {
    grid-column: span 8;
  }

  .analytics-grid__item--span-6 {
    grid-column: span 6;
  }

  .analytics-grid__item--span-4 {
    grid-column: span 4;
  }
}

@media (max-width: 640px) {
  .analytics-page {
    gap: var(--ft-space-4);
  }

  .analytics-grid {
    gap: var(--ft-space-3);
  }
}
</style>
