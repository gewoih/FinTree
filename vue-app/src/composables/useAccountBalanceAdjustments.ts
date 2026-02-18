import { computed, ref } from 'vue';
import { apiService } from '../services/api.service';
import type { AccountBalanceAdjustmentDto } from '../types';
import type { ViewState } from '../types/view-state';

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'userMessage' in error) {
    const message = (error as { userMessage?: string }).userMessage;
    if (typeof message === 'string' && message.trim().length) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useAccountBalanceAdjustments() {
  const adjustments = ref<AccountBalanceAdjustmentDto[]>([]);
  const adjustmentsState = ref<ViewState>('empty');
  const adjustmentsError = ref<string | null>(null);

  const saveState = ref<ViewState>('empty');
  const saveError = ref<string | null>(null);

  const loading = computed(() => adjustmentsState.value === 'loading');
  const saving = computed(() => saveState.value === 'loading');

  async function loadAdjustments(accountId: string | null | undefined) {
    if (!accountId) {
      adjustments.value = [];
      adjustmentsState.value = 'empty';
      adjustmentsError.value = null;
      return;
    }

    adjustmentsState.value = 'loading';
    adjustmentsError.value = null;

    try {
      const data = await apiService.getAccountBalanceAdjustments(accountId);
      adjustments.value = data ?? [];
      adjustmentsState.value = adjustments.value.length > 0 ? 'success' : 'empty';
    } catch (error) {
      console.error('Не удалось загрузить корректировки:', error);
      adjustmentsError.value = resolveErrorMessage(error, 'Не удалось загрузить корректировки.');
      adjustments.value = [];
      adjustmentsState.value = 'error';
    }
  }

  async function saveAdjustment(accountId: string, amount: number): Promise<boolean> {
    if (saving.value) return false;

    saveState.value = 'loading';
    saveError.value = null;

    try {
      await apiService.createAccountBalanceAdjustment(accountId, amount);
      saveState.value = 'success';
      return true;
    } catch (error) {
      console.error('Не удалось сохранить корректировку:', error);
      saveError.value = resolveErrorMessage(error, 'Не удалось сохранить корректировку.');
      saveState.value = 'error';
      return false;
    }
  }

  return {
    adjustments,
    adjustmentsState,
    adjustmentsError,
    loading,
    saveState,
    saveError,
    saving,
    loadAdjustments,
    saveAdjustment,
  };
}
