import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { OnboardingStep } from '../components/analytics/OnboardingStepper.vue';
import { useUserStore } from '../stores/user';
import { useFinanceStore } from '../stores/finance';
import { useAnalytics } from './useAnalytics';
import { useAnalyticsDashboardData } from './useAnalyticsDashboardData';
import { isCategoriesOnboardingVisited, markCategoriesOnboardingVisited } from '../utils/onboarding';
import {
    CATEGORY_SCOPE_OPTIONS,
    DEFAULT_ANALYTICS_READINESS,
    GRANULARITY_OPTIONS,
} from '../constants/analytics-page';
import type { AnalyticsReadinessDto } from '../types';
import type {
    CategoryScope,
    ExpenseGranularity,
} from '../types/analytics';
import type { MonthPickerInstance } from '../types/analytics-page';
import { useChartColors } from './useChartColors';
import { useAnalyticsFormatting } from './useAnalyticsFormatting';
import { useAnalyticsPageMetrics } from './useAnalyticsPageMetrics';

export function useAnalyticsPage() {
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
  const formatting = useAnalyticsFormatting(baseCurrency);
  const {
    normalizeMonth,
    addLocalMonths,
    formatMonthTitle,
  } = formatting;
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
  
  // --- CSS palette is provided by useChartColors composable ---
  function retryDashboard() {
    void loadDashboard(normalizedSelectedMonth.value);
  }

  const {
    summaryMetrics,
    healthCards,
    handleCategorySelect,
    handlePeakSelect,
    handlePeakSummarySelect,
    filteredCategoryLegend,
    categoryChartData,
    categoryDelta,
    peakDays,
    peakSummary,
    expensesChartData,
    forecastSummary,
    forecastChartData,
  } = useAnalyticsPageMetrics({
    analyticsReadiness,
    chartColors,
    dashboard,
    formatting,
    router,
    selectedCategoryScope,
    selectedGranularity,
    selectedMonth,
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

  return {
    analyticsReadiness,
    baseCurrency,
    canNavigateNext,
    categoryChartData,
    categoryDelta,
    categoryScopeOptions,
    dashboardError,
    dashboardLoading,
    expensesChartData,
    filteredCategoryLegend,
    forecastChartData,
    forecastReadinessMessage,
    forecastSummary,
    granularityOptions,
    healthCards,
    isAnalyticsReady,
    isFirstRun,
    isForecastAndStabilityReady,
    isOnboardingDataReady,
    maxMonthDate,
    monthPickerRef,
    onboardingSteps,
    peakDays,
    peakSummary,
    selectedCategoryScope,
    selectedGranularity,
    selectedMonth,
    selectedMonthLabel,
    summaryMetrics,
    goToNextMonth,
    goToPreviousMonth,
    handleCategorySelect,
    handlePeakSelect,
    handlePeakSummarySelect,
    handleSkipOnboarding,
    handleStepClick,
    openMonthPicker,
    retryDashboard,
    updateSelectedMonth,
  };
}
