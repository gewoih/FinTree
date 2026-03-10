import { apiClient } from './index';
import type {
  NewTransactionPayload,
  PagedResult,
  TransactionDto,
  TransactionsQuery,
  UpdateTransactionPayload,
} from '@/types';

export async function getTransactions(
  query: TransactionsQuery = {}
): Promise<PagedResult<TransactionDto>> {
  const params: Record<string, string | number> = {};

  if (query.accountId) {
    params.accountId = query.accountId;
  }

  if (query.categoryId) {
    params.categoryId = query.categoryId;
  }

  if (query.from) {
    params.from = query.from;
  }

  if (query.to) {
    params.to = query.to;
  }

  if (query.search) {
    params.search = query.search;
  }

  if (query.page) {
    params.page = query.page;
  }

  if (query.size) {
    params.size = query.size;
  }

  const res = await apiClient.get<PagedResult<TransactionDto>>('/transaction', {
    params,
  });
  return res.data;
}

export async function createTransaction(
  payload: NewTransactionPayload
): Promise<string> {
  const body = {
    type: payload.type,
    accountId: payload.accountId,
    categoryId: payload.categoryId,
    amount: Math.abs(payload.amount),
    occurredAt: payload.occurredAt,
    description: payload.description,
    isMandatory: payload.isMandatory ?? false,
  };

  const res = await apiClient.post<string>('/Transaction', body);
  return res.data;
}

export async function updateTransaction(
  payload: UpdateTransactionPayload
): Promise<void> {
  const body = {
    id: payload.id,
    accountId: payload.accountId,
    categoryId: payload.categoryId,
    amount: Math.abs(payload.amount),
    occurredAt: payload.occurredAt,
    description: payload.description,
    isMandatory: payload.isMandatory ?? false,
  };

  await apiClient.patch('/Transaction', body);
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiClient.delete('/Transaction', { params: { id } });
}

export async function exportTransactions(): Promise<{ blob: Blob; fileName: string }> {
  const res = await apiClient.get<Blob>('/transaction/export', {
    responseType: 'blob',
  });

  const disposition = res.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  const fileName =
    match?.[1] ?? `transactions_${new Date().toISOString().slice(0, 10)}.txt`;

  return { blob: res.data, fileName };
}
