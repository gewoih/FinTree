import { apiClient } from './index';
import type {
  AccountBalanceAdjustmentDto,
  AccountDto,
  CreateAccountPayload,
  UpdateAccountPayload,
} from '@/types';

export async function getAccounts(archived = false): Promise<AccountDto[]> {
  const res = await apiClient.get<AccountDto[]>('/users/accounts', {
    params: { archived },
  });
  return res.data;
}

export async function createAccount(payload: CreateAccountPayload): Promise<string> {
  const res = await apiClient.post<string>('/accounts', payload);
  return res.data;
}

export async function updateAccount(payload: UpdateAccountPayload): Promise<void> {
  await apiClient.patch(`/accounts/${payload.id}`, { name: payload.name });
}

export async function setPrimaryAccount(accountId: string): Promise<void> {
  await apiClient.patch('/users/main-account', JSON.stringify(accountId), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateAccountLiquidity(
  accountId: string,
  isLiquid: boolean
): Promise<void> {
  await apiClient.patch(`/accounts/${accountId}/liquidity`, { isLiquid });
}

export async function archiveAccount(accountId: string): Promise<void> {
  await apiClient.patch(`/accounts/${accountId}/archive`);
}

export async function unarchiveAccount(accountId: string): Promise<void> {
  await apiClient.patch(`/accounts/${accountId}/unarchive`);
}

export async function deleteAccount(accountId: string): Promise<void> {
  await apiClient.delete(`/accounts/${accountId}`);
}

export async function getAccountBalanceAdjustments(
  accountId: string
): Promise<AccountBalanceAdjustmentDto[]> {
  const res = await apiClient.get<AccountBalanceAdjustmentDto[]>(
    `/accounts/${accountId}/balance-adjustments`
  );
  return res.data;
}

export async function createAccountBalanceAdjustment(
  accountId: string,
  amount: number
): Promise<string> {
  const res = await apiClient.post<string>(
    `/accounts/${accountId}/balance-adjustments`,
    { amount }
  );
  return res.data;
}
