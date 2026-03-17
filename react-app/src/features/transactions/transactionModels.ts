import type { TransactionDto } from '@/types';

export interface TransactionFiltersValue {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  accountId?: string;
  search?: string;
  isMandatory?: boolean;
  page: number;
  pageSize: number;
}

export type TransactionModalMode =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit-transaction'; transaction: TransactionDto };

export type TransactionDisplayRow = {
  id: string;
  occurredAt: string;
  accountName: string;
  amount: number;
  currencyCode: string;
  tone: 'Income' | 'Expense';
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  transaction: TransactionDto;
};

export const DEFAULT_TRANSACTION_FILTERS: TransactionFiltersValue = {
  page: 1,
  pageSize: 25,
};
