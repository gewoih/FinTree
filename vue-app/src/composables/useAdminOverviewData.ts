import { computed, ref } from 'vue';
import { apiService } from '../services/api.service';
import type { AdminOverviewDto } from '../types';
import type { ViewState } from '../types/view-state';

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'userMessage' in error) {
    const message = (error as { userMessage?: string }).userMessage;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function hasOverviewContent(data: AdminOverviewDto): boolean {
  if (data.kpis.totalUsers > 0 || data.kpis.totalTransactions > 0) {
    return true;
  }

  if (data.users.length > 0) {
    return true;
  }

  return false;
}

export function useAdminOverviewData() {
  const overview = ref<AdminOverviewDto | null>(null);
  const state = ref<ViewState>('idle');
  const error = ref<string | null>(null);
  const requestId = ref(0);

  const isLoading = computed(() => state.value === 'loading');
  const isEmpty = computed(() => state.value === 'empty');
  const isError = computed(() => state.value === 'error');
  const isSuccess = computed(() => state.value === 'success');

  async function loadOverview() {
    const currentRequestId = ++requestId.value;
    state.value = 'loading';
    error.value = null;

    try {
      const data = await apiService.getAdminOverview();
      if (currentRequestId !== requestId.value) return;

      overview.value = data;
      state.value = hasOverviewContent(data) ? 'success' : 'empty';
    } catch (loadError) {
      if (currentRequestId !== requestId.value) return;
      overview.value = null;
      state.value = 'error';
      error.value = resolveErrorMessage(loadError, 'Не удалось загрузить админ-панель.');
    }
  }

  function retry() {
    void loadOverview();
  }

  return {
    overview,
    state,
    error,
    isLoading,
    isEmpty,
    isError,
    isSuccess,
    loadOverview,
    retry,
  };
}
