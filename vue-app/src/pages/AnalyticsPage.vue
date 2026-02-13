<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '../components/common/PageHeader.vue';
import SummaryStrip from '../components/analytics/SummaryStrip.vue';
import HealthScoreCard from '../components/analytics/HealthScoreCard.vue';
import PeakDaysCard from '../components/analytics/PeakDaysCard.vue';
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
  CategoryScope,
  ExpenseGranularity,
  ForecastSummary,
} from '../types/analytics';
import PageContainer from '../components/layout/PageContainer.vue';

type MonthPickerInstance = {
  show?: () => void;
  hide?: () => void;
};

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

const categoryScopeOptions: Array<{ label: string; value: CategoryScope }> = [
  { label: 'Все', value: 'all' },
  { label: 'Обязательные', value: 'mandatory' },
  { label: 'Необязательные', value: 'discretionary' },
];
const selectedCategoryScope = ref<CategoryScope>('all');

const dashboard = ref<AnalyticsDashboardDto | null>(null);
const dashboardLoading = ref(false);
const dashboardError = ref<string | null>(null);
const dashboardRequestId = ref(0);

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

// --- Summary strip metrics ---
const summaryMetrics = computed(() => {
  const health = dashboard.value?.health;
  const netCashflow = health?.netCashflow ?? null;
  const savingsRate = health?.savingsRate;

  const balanceAccent: 'good' | 'poor' | 'neutral' =
    netCashflow == null ? 'neutral' : netCashflow >= 0 ? 'good' : 'poor';

  const savingsLabel = savingsRate != null
    ? `Доля сбережений: ${(savingsRate * 100).toFixed(1)}%`
    : undefined;

  return [
    {
      key: 'income',
      label: 'Доход',
      value: formatMoney(health?.monthIncome ?? null),
      icon: 'pi pi-plus-circle',
      accent: 'income' as const,
      tooltip: 'Все поступления за выбранный месяц.',
    },
    {
      key: 'expense',
      label: 'Расходы',
      value: formatMoney(health?.monthTotal ?? null),
      icon: 'pi pi-minus-circle',
      accent: 'expense' as const,
      tooltip: 'Все расходы за выбранный месяц.',
    },
    {
      key: 'balance',
      label: 'Баланс',
      value: formatSignedMoney(netCashflow),
      icon: 'pi pi-wallet',
      accent: balanceAccent,
      tooltip: 'Доходы минус расходы. Положительный баланс — вы в плюсе.',
      secondary: savingsLabel,
    },
  ];
});

// --- Health score cards ---
const healthCards = computed(() => {
  const health = dashboard.value?.health;

  const savingsAccent = resolveSavingsStatus(
    health?.savingsRate ?? null,
    health?.monthIncome ?? null,
    health?.monthTotal ?? null
  );
  const liquidityAccent = resolveLiquidityStatus(health?.liquidMonthsStatus ?? null);
  const typicalAccent = resolveMeanMedianStatus(health?.meanMedianRatio ?? null);
  const discretionaryAccent = resolveDiscretionaryStatus(health?.discretionarySharePercent ?? null);

  return [
    {
      key: 'savings',
      title: 'Сбережения',
      icon: 'pi pi-percentage',
      mainValue: health?.savingsRate == null ? '—' : formatPercent(health.savingsRate, 1),
      mainLabel: 'Доля сбережений',
      secondaryValue: formatSignedMoney(health?.netCashflow ?? null),
      secondaryLabel: 'чистый поток',
      accent: savingsAccent,
      tooltip: 'Часть дохода, которая осталась после расходов. Хорошо, если выше 20%.',
    },
    {
      key: 'liquidity',
      title: 'Ликвидность',
      icon: 'pi pi-shield',
      mainValue: health?.liquidMonths == null ? '—' : `${health.liquidMonths.toFixed(1)} мес.`,
      mainLabel: 'Ликвидные месяцы',
      secondaryValue: formatMoney(health?.liquidAssets ?? null),
      secondaryLabel: 'ликвидные активы',
      accent: liquidityAccent,
      tooltip: 'На сколько месяцев хватит ликвидных средств при текущих расходах. Хорошо — 3+ месяца.',
    },
    {
      key: 'regularity',
      title: 'Регулярность',
      icon: 'pi pi-chart-line',
      mainValue: formatRatio(health?.meanMedianRatio ?? null),
      mainLabel: 'Средний / медианный',
      secondaryValue: `${formatMoney(health?.meanDaily ?? null)} / ${formatMoney(health?.medianDaily ?? null)}`,
      secondaryLabel: 'ср. / мед. в день',
      accent: typicalAccent,
      tooltip: 'Насколько пики трат поднимают среднее. Чем ближе к 1× — тем стабильнее расходы.',
    },
    {
      key: 'discretionary',
      title: 'Необязательные',
      icon: 'pi pi-shopping-bag',
      mainValue: formatPercentValue(health?.discretionarySharePercent ?? null),
      mainLabel: 'Доля необязательных',
      secondaryValue: formatMoney(health?.discretionaryTotal ?? null),
      secondaryLabel: 'сумма',
      accent: discretionaryAccent,
      tooltip: 'Часть расходов на необязательные категории. Хорошо, если ниже 25%.',
    },
  ];
});

// --- Format helpers ---
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

// --- Status resolvers ---
function resolveSavingsStatus(
  value: number | null,
  monthIncome: number | null,
  monthTotal: number | null
): 'good' | 'average' | 'poor' | 'neutral' {
  if (value == null || Number.isNaN(value)) {
    if ((monthIncome ?? 0) <= 0 && (monthTotal ?? 0) > 0) return 'poor';
    return 'neutral';
  }
  if (value >= 0.2) return 'good';
  if (value >= 0.1) return 'average';
  return 'poor';
}

function resolveDiscretionaryStatus(value: number | null): 'good' | 'average' | 'poor' | 'neutral' {
  if (value == null || Number.isNaN(value)) return 'neutral';
  if (value <= 25) return 'good';
  if (value <= 45) return 'average';
  return 'poor';
}

function resolveMeanMedianStatus(value: number | null): 'good' | 'average' | 'poor' | 'neutral' {
  if (value == null || Number.isNaN(value)) return 'neutral';
  if (value <= 1.3) return 'good';
  if (value <= 1.8) return 'average';
  return 'poor';
}

function resolveLiquidityStatus(status: string | null): 'good' | 'average' | 'poor' | 'neutral' {
  if (!status) return 'neutral';
  if (status === 'good') return 'good';
  if (status === 'average') return 'average';
  if (status === 'poor') return 'poor';
  return 'neutral';
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'userMessage' in error) {
    const message = (error as { userMessage?: string }).userMessage;
    if (typeof message === 'string' && message.trim().length) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// --- CSS palette ---
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
  if (fallback.length) chartPalette.categories = fallback;
}

// --- Date helpers ---
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

function formatDateQuery(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(year: number, month: number): string {
  const formatter = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric' });
  return formatter.format(new Date(year, month - 1, 1));
}

function extractRgb(color: string): string {
  if (typeof document === 'undefined') return '46,91,255';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '46,91,255';
  ctx.fillStyle = color;
  const computed = ctx.fillStyle as string;
  const rgbMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) return `${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]}`;
  const match = computed.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match || !match[1] || !match[2] || !match[3]) return '46,91,255';
  return `${parseInt(match[1], 16)},${parseInt(match[2], 16)},${parseInt(match[3], 16)}`;
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

// --- API ---
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
    if (requestId === dashboardRequestId.value) dashboardLoading.value = false;
  }
}

function retryDashboard() {
  void loadDashboard(normalizedSelectedMonth.value);
}

// --- Navigation handlers ---
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

// --- Category data ---
const categoryLegend = computed<CategoryLegendItem[]>(() => {
  const items = dashboard.value?.categories.items ?? [];
  if (!items.length) return [];
  return items.map((item, index) => ({
    id: item.id,
    name: item.name,
    amount: Number(item.amount ?? 0),
    mandatoryAmount: Number(item.mandatoryAmount ?? 0),
    discretionaryAmount: Number(item.discretionaryAmount ?? 0),
    percent: Number(item.percent ?? 0),
    color: item.color?.trim() ?? chartPalette.categories[index % chartPalette.categories.length],
    isMandatory: item.isMandatory ?? false,
  }));
});

const filteredCategoryLegend = computed<CategoryLegendItem[]>(() => {
  const scopedItems = categoryLegend.value
    .map((item) => {
      const scopedAmount = selectedCategoryScope.value === 'mandatory'
        ? item.mandatoryAmount
        : selectedCategoryScope.value === 'discretionary'
          ? item.discretionaryAmount
          : item.amount;
      return { ...item, amount: scopedAmount };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = scopedItems.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) return scopedItems;
  return scopedItems.map((item) => ({
    ...item,
    percent: (item.amount / total) * 100,
  }));
});

const categoryChartData = computed(() => {
  if (!filteredCategoryLegend.value.length) return null;
  return {
    labels: filteredCategoryLegend.value.map((item) => item.name),
    datasets: [
      {
        data: filteredCategoryLegend.value.map((item) => item.amount),
        backgroundColor: filteredCategoryLegend.value.map((item) => item.color),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
      },
    ],
  };
});

// --- Month nav ---
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

// --- Category delta ---
const categoryDelta = computed(() => {
  const delta = dashboard.value?.categories.delta;
  return {
    increased: delta?.increased ?? [],
    decreased: delta?.decreased ?? [],
  };
});

// --- Peak days ---
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
    return { count: 0, totalLabel: '—', shareLabel: '—', shareValue: null, monthLabel: '—' };
  }
  const hasMonthTotal = peaks.monthTotal != null && peaks.monthTotal > 0;
  return {
    count: peaks.count,
    totalLabel: hasMonthTotal ? formatMoney(Number(peaks.total ?? 0)) : '—',
    shareLabel: formatPercentValue(peaks.sharePercent ?? null),
    shareValue: peaks.sharePercent ?? null,
    monthLabel: hasMonthTotal ? formatMoney(Number(peaks.monthTotal ?? 0)) : '—',
  };
});

// --- Expenses chart ---
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
    if (granularity === 'weeks') {
      if (a.year !== b.year) return a.year - b.year;
      return (a.week ?? 0) - (b.week ?? 0);
    }
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    if (granularity === 'days') return (a.day ?? 0) - (b.day ?? 0);
    return 0;
  });
  return sorted;
}

function formatExpenseLabel(entry: MonthlyExpenseDto, granularity: ExpenseGranularity): string {
  if (granularity === 'days' && entry.day != null) {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
      .format(new Date(entry.year, entry.month - 1, entry.day));
  }
  if (granularity === 'weeks' && entry.week != null) {
    const range = getIsoWeekRange(entry.year, entry.week);
    const startLabel = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(range.start);
    const endLabel = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(range.end);
    return `${startLabel} — ${endLabel}`;
  }
  return formatMonthLabel(entry.year, entry.month);
}

// --- Forecast ---
const forecastSummary = computed<ForecastSummary | null>(() => {
  return dashboard.value?.forecast.summary ?? null;
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
        label: 'Оптимистичный',
        data: series.optimistic,
        borderColor: chartPalette.accent,
        borderDash: [3, 5],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.2,
      },
      {
        label: 'Базовый',
        data: series.forecast,
        borderColor: chartPalette.primary,
        borderDash: [8, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.25,
      },
      {
        label: 'Риск',
        data: series.risk,
        borderColor: '#f97316',
        borderDash: [10, 6],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.2,
      },
      ...(hasBaseline
        ? [{
            label: 'Лимит прошлого месяца',
            data: baselineData,
            borderColor: chartPalette.surface,
            borderDash: [4, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0,
          }]
        : []),
    ],
  };
});

// --- Month picker ---
const updateSelectedMonth = (value: Date | Date[] | (Date | null)[] | null | undefined) => {
  if (!value || Array.isArray(value)) return;
  selectedMonth.value = normalizeMonth(value);
};

const openMonthPicker = () => { monthPickerRef.value?.show?.(); };
const goToPreviousMonth = () => { selectedMonth.value = addLocalMonths(normalizedSelectedMonth.value, -1); };
const goToNextMonth = () => {
  if (!canNavigateNext.value) return;
  selectedMonth.value = addLocalMonths(normalizedSelectedMonth.value, 1);
};

watch(selectedMonth, (value) => {
  if (!value) return;
  void loadDashboard(normalizeMonth(value));
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
    <PageHeader title="Аналитика">
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
      <!-- Section 1: Summary Strip -->
      <SummaryStrip
        class="analytics-grid__item analytics-grid__item--span-12"
        :loading="dashboardLoading"
        :error="dashboardError"
        :metrics="summaryMetrics"
        @retry="retryDashboard"
      />

      <!-- Section 2: Two main charts -->
      <SpendingPieCard
        class="analytics-grid__item analytics-grid__item--span-6"
        :loading="dashboardLoading"
        :error="dashboardError"
        :chart-data="categoryChartData"
        :legend="filteredCategoryLegend"
        :currency="baseCurrency"
        :scope="selectedCategoryScope"
        :scope-options="categoryScopeOptions"
        @retry="retryDashboard"
        @update:scope="selectedCategoryScope = $event"
        @select-category="handleCategorySelect"
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

      <!-- Section 3: Health score cards -->
      <HealthScoreCard
        v-for="card in healthCards"
        :key="card.key"
        class="analytics-grid__item analytics-grid__item--span-3"
        :title="card.title"
        :icon="card.icon"
        :main-value="card.mainValue"
        :main-label="card.mainLabel"
        :secondary-value="card.secondaryValue"
        :secondary-label="card.secondaryLabel"
        :accent="card.accent"
        :tooltip="card.tooltip"
      />

      <!-- Section 4 & 5: Peak days + Category delta -->
      <PeakDaysCard
        class="analytics-grid__item analytics-grid__item--span-6"
        :loading="dashboardLoading"
        :error="dashboardError"
        :peaks="peakDays"
        :summary="peakSummary"
        @retry="retryDashboard"
        @select-peak="handlePeakSelect"
        @select-peak-summary="handlePeakSummarySelect"
      />

      <CategoryDeltaCard
        class="analytics-grid__item analytics-grid__item--span-6"
        :loading="dashboardLoading"
        :error="dashboardError"
        :period-label="selectedMonthLabel"
        :increased="categoryDelta.increased"
        :decreased="categoryDelta.decreased"
        :currency="baseCurrency"
        @retry="retryDashboard"
      />

      <!-- Section 6: Forecast -->
      <ForecastCard
        class="analytics-grid__item analytics-grid__item--span-12"
        :loading="dashboardLoading"
        :error="dashboardError"
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

  .analytics-grid__item--span-8 {
    grid-column: span 8;
  }

  .analytics-grid__item--span-6 {
    grid-column: span 6;
  }

  .analytics-grid__item--span-4 {
    grid-column: span 4;
  }

  .analytics-grid__item--span-3 {
    grid-column: span 3;
  }

}

@media (min-width: 641px) and (max-width: 1023px) {
  .analytics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .analytics-grid__item--span-12 {
    grid-column: 1 / -1;
  }

  .analytics-grid__item--span-6 {
    grid-column: span 1;
  }

  .analytics-grid__item--span-3 {
    grid-column: span 1;
  }
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
  .analytics-page {
    gap: var(--ft-space-4);
  }

  .analytics-grid {
    gap: var(--ft-space-3);
  }

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
</style>
