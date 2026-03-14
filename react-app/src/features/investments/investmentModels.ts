import type { AccountType } from '@/types';

export const INVESTMENT_ACCOUNT_TYPES = [2, 3, 4] as const satisfies readonly AccountType[];

export type InvestmentsView = 'active' | 'archived';

export interface InvestmentAccountViewModel {
  id: string;
  name: string;
  type: AccountType;
  currencyCode: string;
  currencyName?: string;
  currencySymbol?: string;
  isLiquid: boolean;
  isArchived: boolean;
  isMain: boolean;
  balance: number;
  balanceInBaseCurrency: number;
  lastAdjustedAt: string | null;
  returnPercent: number | null;
}

export interface InvestmentAllocationSlice {
  id: string;
  name: string;
  value: number;
  share: number;
}

export interface InvestmentNetWorthPoint {
  id: string;
  label: string;
  tooltipLabel: string;
  value: number;
}
