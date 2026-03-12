import type { TransactionDto, UpdateTransferPayload } from '@/types';

export interface TransactionFiltersValue {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  accountId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export type TransactionModalMode =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit-transaction'; transaction: TransactionDto }
  | { type: 'edit-transfer'; payload: UpdateTransferPayload };

export type TransactionDisplayRow =
  | {
      kind: 'transaction';
      id: string;
      occurredAt: string;
      title: string;
      caption: string | null;
      accountName: string;
      amount: number;
      currencyCode: string;
      tone: 'Income' | 'Expense';
      categoryName: string;
      categoryColor: string;
      categoryIcon: string;
      transaction: TransactionDto;
    }
  | {
      kind: 'transfer';
      id: string;
      transferId: string;
      occurredAt: string;
      title: string;
      caption: string | null;
      accountName: string;
      primaryAmount: number;
      primaryCurrencyCode: string;
      secondaryAmount: number | null;
      secondaryCurrencyCode: string | null;
      feeAmount: number | null;
    };

export const DEFAULT_TRANSACTION_FILTERS: TransactionFiltersValue = {
  page: 1,
  pageSize: 25,
};
