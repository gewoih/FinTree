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
import OnboardingStepper from '../components/analytics/OnboardingStepper.vue';
import type { OnboardingStep } from '../components/analytics/OnboardingStepper.vue';
import { useUserStore } from '../stores/user';
import { useFinanceStore } from '../stores/finance';
import { useAnalytics } from '../composables/useAnalytics';
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

const userStore = useUserStore();
const financeStore = useFinanceStore();
const router = useRouter();
const { trackEvent } = useAnalytics();

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

const hasMainAccount = computed(() => financeStore.accounts.some(account => account.isMain));
const isTelegramLinked = computed(() => Boolean(userStore.currentUser?.telegramUserId));
const hasTransactions = computed(() => {
  if (!dashboard.value) return false;
  const hasCategories = (dashboard.value.categories?.items?.length ?? 0) > 0;
  const hasSpending = (dashboard.value.spending?.days ?? []).some(item => item.amount > 0);
  return hasCategories || hasSpending;
});

const isFirstRun = computed(() => userStore.isFirstRun);

const onboardingSteps = computed<OnboardingStep[]>(() => [
  {
    key: 'account',
    title: 'Создайте счёт',
    description: 'Добавьте Ваш первый счёт, чтобы начать отслеживать расходы.',
    completed: hasMainAccount.value,
    actionLabel: 'Создать счёт',
    actionTo: '/accounts',
  },
  {
    key: 'telegram',
    title: 'Подключите Telegram',
    description: 'Привяжите Ваш Telegram в настройках, чтобы записывать траты прямо через нашего бота.',
    completed: isTelegramLinked.value,
    actionLabel: 'Подключить',
    actionTo: '/profile#telegram',
  },
  {
    key: 'transactions',
    title: 'Создайте Вашу первую транзакцию',
    description: 'Добавьте первую транзакцию чтобы завершить обучение.',
    completed: hasTransactions.value,
    actionLabel: 'Добавить транзакцию',
    actionTo: '/expenses',
  },
]);

function handleStepClick(step: OnboardingStep) {
  trackEvent('onboarding_step_click', { step: step.key });
  void router.push(step.actionTo);
}

async function handleSkipOnboarding() {
  trackEvent('onboarding_skip');
  await userStore.skipOnboarding();
}

// --- Summary strip metrics ---
const summaryMetrics = computed(() => {
  const health = dashboard.value?.health;
  const netCashflow = health?.netCashflow ?? null;

  const balanceAccent: 'good' | 'poor' | 'neutral' =
    netCashflow == null ? 'neutral' : netCashflow >= 0 ? 'good' : 'poor';

  return [
    {
      key: 'income',
      label: 'Доход',
      value: formatMoney(health?.monthIncome ?? null),
      icon: 'pi pi-plus-circle',
      accent: 'income' as const,
      tooltip: 'Все доходы за выбранный месяц.',
    },
    {
      key: 'expense',
      label: 'Расходы',
      value: formatMoney(health?.monthTotal ?? null),
      icon: 'pi pi-minus-circle',
      accent: 'expense' as const,
      tooltip: 'Все расходы за выбранный месяц.',
      secondary: (() => {
        const momChange = health?.monthOverMonthChangePercent ?? null;
        return momChange != null
          ? `${momChange > 0 ? '+' : ''}${momChange.toFixed(1)}% к пред. месяцу`
          : undefined;
      })(),
    },
    {
      key: 'balance',
      label: 'Баланс',
      value: formatSignedMoney(netCashflow),
      icon: 'pi pi-wallet',
      accent: balanceAccent,
      tooltip: 'Доходы минус расходы.',
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
  const cushionAccent = resolveCushionStatus(health?.liquidMonthsStatus ?? null);
  const stabilityAccent = resolveStabilityStatus(health?.stabilityIndex ?? null);
  const discretionaryAccent = resolveDiscretionaryStatus(health?.discretionarySharePercent ?? null);

  return [
    {
      key: 'savings',
      title: 'Сбережения',
      icon: 'pi pi-percentage',
      mainValue: health?.savingsRate == null ? '—' : formatPercent(health.savingsRate, 1),
      mainLabel: '',
      secondaryValue: formatSignedMoney(health?.netCashflow ?? null),
      secondaryLabel: 'сохранено',
      accent: savingsAccent,
      tooltip: 'Ваша сэкономленная часть от доходов.',
    },
    {
      key: 'liquidity',
      title: 'Финансовая подушка',
      icon: 'pi pi-shield',
      mainValue: health?.liquidMonths == null ? '—' : `${health.liquidMonths.toFixed(1)} мес.`,
      mainLabel: '',
      secondaryValue: formatMoney(health?.liquidAssets ?? null),
      secondaryLabel: 'сумма подушки',
      accent: cushionAccent,
      tooltip: 'На сколько месяцев жизни хватит средств из подушки безопасности.',
    },
    {
      key: 'stability',
      title: 'Индекс стабильности',
      icon: 'pi pi-chart-line',
      mainValue: health?.stabilityIndex == null ? '-' : health?.stabilityIndex.toString(),
      mainLabel: '',
      secondaryValue: resolveStabilityLabel(health?.stabilityIndex ?? null),
      secondaryLabel: '',
      accent: stabilityAccent,
      tooltip: 'Насколько стабильны ваши расходы. Чем ниже ниже индекс — тем лучше.',
    },
    {
      key: 'discretionary',
      title: 'Необязательные',
      icon: 'pi pi-shopping-bag',
      mainValue: formatPercentValue(health?.discretionarySharePercent ?? null),
      mainLabel: '',
      secondaryValue: formatMoney(health?.discretionaryTotal ?? null),
      secondaryLabel: 'сумма',
      accent: discretionaryAccent,
      tooltip: 'Ваши необязательные расходы.',
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

function resolveStabilityStatus(value: number | null): 'good' | 'average' | 'poor' | 'neutral' {
  if (value == null || Number.isNaN(value)) return 'neutral';
  if (value <= 1.0) return 'good';
  if (value <= 2.0) return 'average';
  return 'poor';
}

function resolveCushionStatus(status: string | null): 'good' | 'average' | 'poor' | 'neutral' {
  if (!status) return 'neutral';
  if (status === 'good') return 'good';
  if (status === 'average') return 'average';
  if (status === 'poor') return 'poor';
  return 'neutral';
}

function resolveStabilityLabel(index: number | null): string {
  if (index == null || Number.isNaN(index)) return '—';
  if (index <= 1.0) return 'Ваши расходы стабильны';
  if (index <= 2.0) return 'Редкие всплески расходов';
  return 'Частые всплески расходов, много крупных покупок';
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
  await userStore.fetchCurrentUser(true);
  await Promise.all([
    loadDashboard(normalizedSelectedMonth.value),
    financeStore.fetchAccounts(true),
  ]);

  if (isFirstRun.value) {
    trackEvent('onboarding_start');
  }
});
</script>

<template>
  <PageContainer class="analytics-page">
    <PageHeader title="Главная">
      <template
        v-if="!isFirstRun"
        #actions
      >
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

    <OnboardingStepper
      v-if="isFirstRun"
      :steps="onboardingSteps"
      :loading="dashboardLoading"
      @step-click="handleStepClick"
      @skip="handleSkipOnboarding"
    />

    <div
      v-if="!isFirstRun"
      class="analytics-grid"
    >
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
  gap: 0.4rem;
  align-items: center;

  padding: 0.25rem 0.5rem;

  background: color-mix(in srgb, var(--ft-surface-raised) 85%, transparent);
  border: 1px solid color-mix(in srgb, var(--ft-border-subtle) 70%, transparent);
  border-radius: 999px;
}

.analytics-month-selector button {
  flex: 0 0 auto;
}

.analytics-month-selector__button {
  cursor: pointer;

  padding: 0.2rem;

  font-size: 0.9rem;
  color: var(--ft-text-secondary);

  background: transparent;
  border: none;
  border-radius: 999px;

  transition: color var(--ft-transition-fast), background-color var(--ft-transition-fast);
}

.analytics-month-selector__button:hover:not(:disabled) {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-surface-base) 70%, transparent);
}

.analytics-month-selector__button:disabled {
  cursor: default;
  opacity: 0.4;
}

.analytics-month-selector__label {
  cursor: pointer;

  padding: 0.2rem 0.35rem;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  white-space: nowrap;

  background: transparent;
  border: none;
}

.analytics-month-selector__picker {
  pointer-events: none;

  position: absolute;

  width: 0;
  height: 0;

  opacity: 0;
}

@media (width <= 640px) {
  .analytics-month-selector {
    justify-content: space-between;
    width: 100%;
  }

  .analytics-month-selector__label {
    flex: 1;
    text-align: center;
  }
}

@media (width >= 1024px) {
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

@media (width >= 641px) and (width <= 1023px) {
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

@media (width <= 640px) {
  .analytics-page {
    gap: var(--ft-space-4);
  }

  .analytics-grid {
    gap: var(--ft-space-3);
  }
}
</style>
