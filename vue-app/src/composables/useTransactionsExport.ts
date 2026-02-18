import { computed, ref } from 'vue';
import { apiService } from '../services/api.service';
import type { ViewState } from '../types/view-state';

type ExportedTransactionsFile = {
  blob: Blob;
  fileName: string;
};

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'userMessage' in error) {
    const message = (error as { userMessage?: string }).userMessage;
    if (typeof message === 'string' && message.trim().length) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useTransactionsExport() {
  const exportState = ref<ViewState>('empty');
  const exportError = ref<string | null>(null);
  const isExporting = computed(() => exportState.value === 'loading');

  async function exportTransactions(): Promise<ExportedTransactionsFile | null> {
    if (isExporting.value) return null;

    exportState.value = 'loading';
    exportError.value = null;

    try {
      const result = await apiService.exportTransactions();
      exportState.value = 'success';
      return result;
    } catch (error) {
      exportState.value = 'error';
      exportError.value = resolveErrorMessage(error, 'Не удалось сформировать файл.');
      throw error;
    }
  }

  return {
    exportState,
    exportError,
    isExporting,
    exportTransactions,
  };
}
