import { computed, ref } from 'vue';
import { apiService } from '../services/api.service';
import type { InvestmentsOverviewDto, NetWorthSnapshotDto } from '../types';
import type { ViewState } from '../types/view-state';

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'userMessage' in error) {
    const message = (error as { userMessage?: string }).userMessage;
    if (typeof message === 'string' && message.trim().length) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useInvestmentsData() {
  const overview = ref<InvestmentsOverviewDto | null>(null);
  const overviewState = ref<ViewState>('empty');
  const overviewError = ref<string | null>(null);

  const netWorthSnapshots = ref<NetWorthSnapshotDto[]>([]);
  const netWorthState = ref<ViewState>('empty');
  const netWorthError = ref<string | null>(null);

  const overviewLoading = computed(() => overviewState.value === 'loading');
  const netWorthLoading = computed(() => netWorthState.value === 'loading');

  async function loadOverview() {
    overviewState.value = 'loading';
    overviewError.value = null;

    try {
      const data = await apiService.getInvestmentsOverview();
      overview.value = data;
      overviewState.value = data.accounts.length > 0 ? 'success' : 'empty';
    } catch (error) {
      console.error('Не удалось загрузить инвестиции:', error);
      overviewError.value = resolveErrorMessage(error, 'Не удалось загрузить данные по инвестициям.');
      overview.value = null;
      overviewState.value = 'error';
    }
  }

  async function loadNetWorth(months = 12) {
    netWorthState.value = 'loading';
    netWorthError.value = null;

    try {
      const data = await apiService.getNetWorthTrend(months);
      netWorthSnapshots.value = data;
      netWorthState.value = data.length > 0 ? 'success' : 'empty';
    } catch (error) {
      console.error('Не удалось загрузить динамику капитала:', error);
      netWorthError.value = resolveErrorMessage(error, 'Не удалось загрузить динамику капитала.');
      netWorthSnapshots.value = [];
      netWorthState.value = 'error';
    }
  }

  async function refreshInvestmentsData(months = 12) {
    await Promise.all([
      loadOverview(),
      loadNetWorth(months),
    ]);
  }

  return {
    overview,
    overviewState,
    overviewLoading,
    overviewError,
    netWorthSnapshots,
    netWorthState,
    netWorthLoading,
    netWorthError,
    loadOverview,
    loadNetWorth,
    refreshInvestmentsData,
  };
}
