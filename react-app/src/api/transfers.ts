import { apiClient } from './index';
import type { CreateTransferPayload, UpdateTransferPayload } from '@/types';

export async function createTransfer(payload: CreateTransferPayload): Promise<string> {
  const body = {
    fromAccountId: payload.fromAccountId,
    toAccountId: payload.toAccountId,
    fromAmount: Math.abs(payload.fromAmount),
    toAmount: Math.abs(payload.toAmount),
    occurredAt: payload.occurredAt,
    feeAmount: payload.feeAmount != null ? Math.abs(payload.feeAmount) : null,
    description: payload.description,
  };

  const res = await apiClient.post<string>('/Transaction/transfer', body);
  return res.data;
}

export async function updateTransfer(
  payload: UpdateTransferPayload
): Promise<void> {
  const body = {
    transferId: payload.transferId,
    fromAccountId: payload.fromAccountId,
    toAccountId: payload.toAccountId,
    fromAmount: Math.abs(payload.fromAmount),
    toAmount: Math.abs(payload.toAmount),
    occurredAt: payload.occurredAt,
    feeAmount: payload.feeAmount != null ? Math.abs(payload.feeAmount) : null,
    description: payload.description,
  };

  await apiClient.patch('/Transaction/transfer', body);
}

export async function deleteTransfer(transferId: string): Promise<void> {
  await apiClient.delete('/Transaction/transfer', { params: { transferId } });
}
