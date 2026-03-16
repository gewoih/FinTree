import {
  Bitcoin,
  Building2,
  PiggyBank,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Account, AccountDto, AccountType, Currency } from '@/types';
import { normalizeAccountType } from '@/utils/format';
import type { AccountTypeOption } from './accountModels';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  0: 'Банковский счёт',
  2: 'Криптовалюта',
  3: 'Брокерский счёт',
  4: 'Депозит',
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  0: Building2,
  2: Bitcoin,
  3: TrendingUp,
  4: PiggyBank,
};

const ACCOUNT_TYPE_API_VALUES: Record<AccountType, 'Bank' | 'Crypto' | 'Brokerage' | 'Deposit'> = {
  0: 'Bank',
  2: 'Crypto',
  3: 'Brokerage',
  4: 'Deposit',
};

export const BANK_ACCOUNT_TYPE: AccountType = 0;

export const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  { label: 'Банк', value: 0 },
  { label: 'Криптовалюта', value: 2 },
  { label: 'Брокерский', value: 3 },
  { label: 'Депозит', value: 4 },
];

export function getAccountTypeLabel(rawType: AccountType | string | number): string {
  const type = normalizeAccountType(rawType);
  return ACCOUNT_TYPE_LABELS[type] ?? 'Счёт';
}

export function getAccountTypeIcon(
  rawType: AccountType | string | number
): LucideIcon {
  const type = normalizeAccountType(rawType);
  return ACCOUNT_TYPE_ICONS[type] ?? Wallet;
}

export function toApiAccountType(
  type: AccountType
): 'Bank' | 'Crypto' | 'Brokerage' | 'Deposit' {
  return ACCOUNT_TYPE_API_VALUES[type];
}

export function normalizeAccount(
  account: AccountDto,
  currencies: Currency[] | undefined
): Account {
  const type = normalizeAccountType(account.type);
  const currency =
    currencies?.find((item) => item.code === account.currencyCode) ?? null;

  return {
    ...account,
    type,
    currency,
  };
}

export function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((left, right) => {
    if (left.isMain && !right.isMain) {
      return -1;
    }

    if (!left.isMain && right.isMain) {
      return 1;
    }

    return right.balanceInBaseCurrency - left.balanceInBaseCurrency;
  });
}

export function filterBankAccounts(accounts: Account[]): Account[] {
  return accounts.filter((account) => account.type === BANK_ACCOUNT_TYPE);
}

export function filterAccounts(accounts: Account[], searchText: string): Account[] {
  const query = searchText.trim().toLowerCase();

  if (!query) {
    return accounts;
  }

  return accounts.filter((account) => {
    const currencyName = account.currency?.name?.toLowerCase() ?? '';

    return (
      account.name.toLowerCase().includes(query) ||
      account.currencyCode.toLowerCase().includes(query) ||
      currencyName.includes(query)
    );
  });
}

export function getCurrencyOptionLabel(currency: Currency): string {
  return `${currency.symbol} ${currency.code} · ${currency.name}`;
}
