import { apiClient } from './index';
import type {
  AccountDto,
  AccountType,
  CreateAccountPayload,
  TransactionType,
  UpdateAccountPayload,
} from '@/types';

const ACCOUNT_TYPE_API_VALUES: Record<
  AccountType,
  'Bank' | 'Crypto' | 'Brokerage' | 'Deposit'
> = {
  0: 'Bank',
  2: 'Crypto',
  3: 'Brokerage',
  4: 'Deposit',
};

export async function getAccounts(
  archived = false,
  types?: readonly AccountType[]
): Promise<AccountDto[]> {
  const params = new URLSearchParams({ archived: String(archived) });

  for (const type of types ?? []) {
    params.append('types', ACCOUNT_TYPE_API_VALUES[type]);
  }

  const res = await apiClient.get<AccountDto[]>(`/users/accounts?${params.toString()}`);
  return res.data;
}

export async function createAccount(payload: CreateAccountPayload): Promise<string> {
  const res = await apiClient.post<string>('/accounts', {
    ...payload,
    type: ACCOUNT_TYPE_API_VALUES[payload.type],
  });
  return res.data;
}

export async function updateAccount(payload: UpdateAccountPayload): Promise<void> {
  await apiClient.patch(`/accounts/${payload.id}`, { name: payload.name });
}

export async function setPrimaryAccount(accountId: string): Promise<void> {
  await apiClient.patch('/users/main-account', { accountId });
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

export async function createInvestmentCashFlow(
  accountId: string,
  type: TransactionType,
  amount: number,
  occurredAt: string,
  description: string | null
): Promise<string> {
  const res = await apiClient.post<string>(
    `/accounts/${accountId}/cash-flows`,
    { type, amount, occurredAt, description }
  );
  return res.data;
}
