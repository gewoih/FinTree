import type { Account, AccountType } from '@/types';

export type AccountsView = 'active' | 'archived';

export type ManagedAccount = Account;

export interface AccountTypeOption {
  label: string;
  value: AccountType;
}
