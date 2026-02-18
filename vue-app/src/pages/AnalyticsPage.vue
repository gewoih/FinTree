<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
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
import { useAnalyticsDashboardData } from '../composables/useAnalyticsDashboardData';
import { isCategoriesOnboardingVisited, markCategoriesOnboardingVisited } from '../utils/onboarding';
import { CATEGORY_SCOPE_OPTIONS, DEFAULT_ANALYTICS_READINESS, GRANULARITY_OPTIONS } from '../constants/analytics-page';
import UiDatePicker from '@/ui/UiDatePicker.vue';
import type {
  AnalyticsReadinessDto,
  MonthlyExpenseDto,
} from '../types';
import type {
  CategoryLegendItem,
  CategoryScope,
  ExpenseGranularity,
  ForecastSummary,
} from '../types/analytics';
import type { MonthPickerInstance, PeakDayItem } from '../types/analytics-page';
import PageContainer from '../components/layout/PageContainer.vue';
import PageHeader from '../components/common/PageHeader.vue';
import { useChartColors } from '../composables/useChartColors';
import { useAnalyticsFormatting } from '../composables/useAnalyticsFormatting';
import UiSkeleton from '../ui/UiSkeleton.vue';
const userStore = useUserStore();
const financeStore = useFinanceStore();
const router = useRouter();
const { trackEvent } = useAnalytics();

const now = new Date();
const selectedMonth = ref<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
const monthPickerRef = ref<MonthPickerInstance | null>(null);
const granularityOptions = GRANULARITY_OPTIONS;
const selectedGranularity = ref<ExpenseGranularity>('days');
const categoryScopeOptions = CATEGORY_SCOPE_OPTIONS;
const selectedCategoryScope = ref<CategoryScope>('all');

const {
  dashboard,
  dashboardLoading,
  dashboardError,
  loadDashboard,
  onboardingHasAnyTransactions,
  onboardingTransactionsLoading,
  loadOnboardingTransactionsState,
  resetOnboardingTransactionsState,
} = useAnalyticsDashboardData(() => userStore.currentUser?.id ?? null);
const onboardingSyncedForUserId = ref<string | null>(null);
const onboardingSyncInFlight = ref(false);
const hasVisitedCategoriesStep = ref(false);

const { colors: chartColors } = useChartColors();

const baseCurrency = computed(() => userStore.baseCurrencyCode ?? 'RUB');
const {
  formatPercent,
  formatPercentValue,
  formatMoney,
  formatSignedMoney,
  resolveSavingsStatus,
  resolveDiscretionaryStatus,
  resolveStabilityStatus,
  resolveCushionStatus,
  resolveStabilityLabel,
  normalizeMonth,
  addLocalMonths,
  getMonthRangeLocal,
  formatMonthTitle,
  formatDateQuery,
  formatMonthLabel,
  hexToRgb,
  getIsoWeekRange
} = useAnalyticsFormatting(baseCurrency);
const currentUserId = computed(() => userStore.currentUser?.id ?? null);

const hasMainAccount = computed(() => financeStore.accounts.some(account => account.isMain));
const isTelegramLinked = computed(() => Boolean(userStore.currentUser?.telegramUserId));
const hasTransactions = computed(() => onboardingHasAnyTransactions.value);
const isTelegramRegisteredUser = computed(() => Boolean(userStore.currentUser?.registeredViaTelegram));
const analyticsReadiness = computed<AnalyticsReadinessDto>(
  () => dashboard.value?.readiness ?? DEFAULT_ANALYTICS_READINESS
);
const isForecastAndStabilityReady = computed(
  () => analyticsReadiness.value.hasForecastAndStabilityData
);
const forecastReadinessMessage = 'Недостаточно данных, продолжайте добавлять транзакции';

const isFirstRun = computed(() => userStore.isFirstRun);
const isAnalyticsReady = computed(() => financeStore.areAccountsReady && financeStore.areCategoriesReady);
const isOnboardingDataReady = computed(() =>
  isAnalyticsReady.value && !onboardingTransactionsLoading.value
);
const areBackendRequiredOnboardingStepsComplete = computed(() =>
  hasMainAccount.value && isTelegramLinked.value && hasTransactions.value
);
const areLocalRequiredOnboardingStepsComplete = computed(() =>
  hasVisitedCategoriesStep.value && areBackendRequiredOnboardingStepsComplete.value
);

const onboardingSteps = computed<OnboardingStep[]>(() => {
  const steps: OnboardingStep[] = [
    {
      key: 'categories',
      title: 'Проверьте категории',
      description: 'Откройте категории и проверьте, что они вам подходят.',
      completed: hasVisitedCategoriesStep.value,
      actionLabel: 'Перейти в категории',
      actionTo: '/categories',
    },
    {
      key: 'account',
      title: 'Добавьте первый счёт',
      description: 'Создайте счёт, с которого начнёте вести учёт расходов и доходов.',
      completed: hasMainAccount.value,
      actionLabel: 'Перейти к счетам',
      actionTo: '/accounts',
    },
  ];

  if (!isTelegramRegisteredUser.value) {
    steps.push({
      key: 'telegram',
      title: 'Привяжите Telegram',
      description: 'Подключите Telegram в профиле, чтобы быстро добавлять операции через бота.',
      completed: isTelegramLinked.value,
      actionLabel: 'Открыть профиль',
      actionTo: '/profile#telegram',
    });
  }

  steps.push({
    key: 'transactions',
    title: 'Добавьте первую операцию',
    description: 'Создайте первую транзакцию, чтобы завершить обучение.',
    completed: hasTransactions.value,
    actionLabel: 'Открыть транзакции',
    actionTo: '/transactions',
  });

  return steps;
});

function handleStepClick(step: OnboardingStep) {
  if (step.key === 'categories') {
    markCategoriesOnboardingVisited(currentUserId.value);
    hasVisitedCategoriesStep.value = true;
  }

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
      label: 'Баланс месяца',
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
  const readiness = analyticsReadiness.value;
  const stabilityTooltip = readiness.hasForecastAndStabilityData
    ? 'Насколько стабильны ваши расходы. Чем ниже ниже индекс — тем лучше.'
    : `Индекс появится после ${readiness.requiredExpenseDays} дней с расходами. Сейчас: ${readiness.observedExpenseDays}.`;

  const savingsAccent = resolveSavingsStatus(
    health?.savingsRate ?? null,
    health?.monthIncome ?? null,
    health?.monthTotal ?? null
  );
  const cushionAccent = resolveCushionStatus(health?.liquidMonthsStatus ?? null);
  const stabilityAccent = readiness.hasForecastAndStabilityData
    ? resolveStabilityStatus(health?.stabilityIndex ?? null)
    : 'neutral';
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
      mainValue: readiness.hasForecastAndStabilityData
        ? (health?.stabilityIndex == null ? '-' : health.stabilityIndex.toString())
        : 'Недостаточно данных',
      mainLabel: readiness.hasForecastAndStabilityData ? '' : 'Продолжайте добавлять транзакции',
      secondaryValue: readiness.hasForecastAndStabilityData
        ? resolveStabilityLabel(health?.stabilityIndex ?? null)
        : `${readiness.observedExpenseDays} из ${readiness.requiredExpenseDays}`,
      secondaryLabel: readiness.hasForecastAndStabilityData ? '' : 'дней расходов',
      accent: stabilityAccent,
      tooltip: stabilityTooltip,
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

// --- CSS palette is provided by useChartColors composable ---

function retryDashboard() {
  void loadDashboard(normalizedSelectedMonth.value);
}

// --- Navigation handlers ---
function handleCategorySelect(category: CategoryLegendItem) {
  const range = getMonthRangeLocal(selectedMonth.value);
  void router.push({
    name: 'transactions',
    query: {
      categoryId: category.id,
      from: formatDateQuery(range.from),
      to: formatDateQuery(range.to),
    },
  });
}

function handlePeakSelect(peak: PeakDayItem) {
  void router.push({
    name: 'transactions',
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
    name: 'transactions',
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
    color: item.color?.trim() ?? chartColors.palette[index % chartColors.palette.length],
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
        borderColor: chartColors.surface,
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
        backgroundColor: `rgba(${hexToRgb(chartColors.accent)}, 0.65)`,
        borderColor: chartColors.accent,
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
        borderColor: chartColors.accent,
        backgroundColor: `rgba(${hexToRgb(chartColors.accent)}, 0.18)`,
        fill: true,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: chartColors.accent,
        pointBorderColor: chartColors.surface,
        spanGaps: false,
      },
      {
        label: 'Оптимистичный',
        data: series.optimistic,
        borderColor: chartColors.accent,
        borderDash: [3, 5],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.2,
      },
      {
        label: 'Базовый',
        data: series.forecast,
        borderColor: chartColors.primary,
        borderDash: [8, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.25,
      },
      {
        label: 'Риск',
        data: series.risk,
        borderColor: chartColors.risk,
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
            borderColor: chartColors.grid,
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

watch(
  () => currentUserId.value,
  (userId) => {
    resetOnboardingTransactionsState();
    onboardingSyncedForUserId.value = null;
    hasVisitedCategoriesStep.value = isCategoriesOnboardingVisited(userId);
  },
  { immediate: true }
);

watch(
  [() => currentUserId.value, isFirstRun, areLocalRequiredOnboardingStepsComplete],
  async ([userId, firstRun, requiredComplete]) => {
    if (!userId || !firstRun || !requiredComplete) return;
    if (onboardingSyncedForUserId.value === userId || onboardingSyncInFlight.value) return;

    onboardingSyncedForUserId.value = userId;
    onboardingSyncInFlight.value = true;
    try {
      await userStore.fetchCurrentUser(true);
    } catch (error) {
      console.error('Не удалось синхронизировать статус онбординга:', error);
    } finally {
      onboardingSyncInFlight.value = false;
    }
  }
);

onMounted(async () => {
  // User is already loaded by router guard (authStore.ensureSession)
  const shouldLoadOnboardingState = isFirstRun.value;
  await Promise.all([
    loadDashboard(normalizedSelectedMonth.value),
    financeStore.fetchAccounts(),
    financeStore.fetchCategories(),
    shouldLoadOnboardingState ? loadOnboardingTransactionsState() : Promise.resolve(),
  ]);

  if (shouldLoadOnboardingState) {
    trackEvent('onboarding_start');
  }
});
</script>

<template>
  <PageContainer class="analytics-page">
    <PageHeader title="Главная">
      <template
        v-if="!isFirstRun && isAnalyticsReady"
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
          <UiDatePicker
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

    <div
      v-if="isFirstRun && !isOnboardingDataReady"
      class="analytics-onboarding-skeleton"
    >
      <UiSkeleton
        height="64px"
        width="100%"
      />
      <UiSkeleton
        height="64px"
        width="100%"
      />
      <UiSkeleton
        height="64px"
        width="100%"
      />
    </div>

    <OnboardingStepper
      v-else-if="isFirstRun"
      :steps="onboardingSteps"
      :loading="dashboardLoading"
      @step-click="handleStepClick"
      @skip="handleSkipOnboarding"
    />

    <div
      v-else-if="!isAnalyticsReady"
      class="analytics-grid analytics-grid--skeleton"
    >
      <UiSkeleton
        v-for="i in 6"
        :key="i"
        class="analytics-grid__skeleton-item"
        height="180px"
        width="100%"
      />
    </div>

    <div
      v-else
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
        :readiness-met="isForecastAndStabilityReady"
        :readiness-message="forecastReadinessMessage"
        :observed-expense-days="analyticsReadiness.observedExpenseDays"
        :required-expense-days="analyticsReadiness.requiredExpenseDays"
        @retry="retryDashboard"
      />
    </div>
  </PageContainer>
</template>

<style scoped src="../styles/pages/analytics-page.css"></style>
