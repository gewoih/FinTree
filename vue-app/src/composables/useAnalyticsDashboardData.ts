import { computed, ref } from 'vue';
import { apiService } from '../services/api.service';
import type { AnalyticsDashboardDto } from '../types';
import type { ViewState } from '../types/view-state';

type UserIdResolver = () => string | null;

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'userMessage' in error) {
    const message = (error as { userMessage?: string }).userMessage;
    if (typeof message === 'string' && message.trim().length) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function hasDashboardContent(data: AnalyticsDashboardDto): boolean {
  const hasCategoryData = (data.categories?.items?.length ?? 0) > 0;
  const hasSpendingData = (data.spending?.days?.length ?? 0) > 0 ||
    (data.spending?.weeks?.length ?? 0) > 0 ||
    (data.spending?.months?.length ?? 0) > 0;
  const hasPeakDays = (data.peakDays?.length ?? 0) > 0;
  const hasForecast = (data.forecast?.series?.days?.length ?? 0) > 0;

  return hasCategoryData || hasSpendingData || hasPeakDays || hasForecast;
}

export function useAnalyticsDashboardData(resolveUserId: UserIdResolver) {
  const dashboard = ref<AnalyticsDashboardDto | null>(null);
  const dashboardState = ref<ViewState>('empty');
  const dashboardError = ref<string | null>(null);
  const dashboardRequestId = ref(0);

  const onboardingHasAnyTransactions = ref(false);
  const onboardingTransactionsState = ref<ViewState>('empty');
  const onboardingTransactionsRequestId = ref(0);

  const dashboardLoading = computed(() => dashboardState.value === 'loading');
  const onboardingTransactionsLoading = computed(() => onboardingTransactionsState.value === 'loading');

  async function loadDashboard(month: Date) {
    const requestId = ++dashboardRequestId.value;
    dashboardState.value = 'loading';
    dashboardError.value = null;

    try {
      const year = month.getFullYear();
      const apiMonth = month.getMonth() + 1;
      const data = await apiService.getAnalyticsDashboard(year, apiMonth);
      if (requestId !== dashboardRequestId.value) return;

      dashboard.value = data;
      dashboardState.value = hasDashboardContent(data) ? 'success' : 'empty';
    } catch (error) {
      if (requestId !== dashboardRequestId.value) return;
      dashboardError.value = resolveErrorMessage(error, 'Не удалось загрузить аналитику.');
      dashboard.value = null;
      dashboardState.value = 'error';
    }
  }

  function resetOnboardingTransactionsState() {
    onboardingTransactionsRequestId.value += 1;
    onboardingHasAnyTransactions.value = false;
    onboardingTransactionsState.value = 'empty';
  }

  async function loadOnboardingTransactionsState() {
    const requestUserId = resolveUserId();
    if (!requestUserId) {
      resetOnboardingTransactionsState();
      return;
    }

    const requestId = ++onboardingTransactionsRequestId.value;
    onboardingTransactionsState.value = 'loading';

    try {
      const response = await apiService.getTransactions({
        page: 1,
        size: 1,
      });

      const isLatestRequest = requestId === onboardingTransactionsRequestId.value;
      const isSameUser = requestUserId === resolveUserId();
      if (!isLatestRequest || !isSameUser) return;

      onboardingHasAnyTransactions.value = response.total > 0;
      onboardingTransactionsState.value = response.total > 0 ? 'success' : 'empty';
    } catch (error) {
      const isLatestRequest = requestId === onboardingTransactionsRequestId.value;
      const isSameUser = requestUserId === resolveUserId();
      if (!isLatestRequest || !isSameUser) return;

      console.error('Не удалось определить наличие транзакций для онбординга:', error);
      onboardingHasAnyTransactions.value = false;
      onboardingTransactionsState.value = 'error';
    }
  }

  return {
    dashboard,
    dashboardState,
    dashboardLoading,
    dashboardError,
    loadDashboard,
    onboardingHasAnyTransactions,
    onboardingTransactionsState,
    onboardingTransactionsLoading,
    loadOnboardingTransactionsState,
    resetOnboardingTransactionsState,
  };
}
