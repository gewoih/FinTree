import { DEFAULT_TRANSACTION_FILTERS, type TransactionFiltersValue } from './transactionModels';

export interface TransactionsRouteSearch {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  accountId?: string;
  search?: string;
  isMandatory?: boolean;
  page?: number;
}

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getPositiveInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function validateTransactionsRouteSearch(
  search: Record<string, unknown>,
): TransactionsRouteSearch {
  return {
    dateFrom: getNonEmptyString(search.dateFrom),
    dateTo: getNonEmptyString(search.dateTo),
    categoryId: getNonEmptyString(search.categoryId),
    accountId: getNonEmptyString(search.accountId),
    search: getNonEmptyString(search.search),
    isMandatory: typeof search.isMandatory === 'boolean' ? search.isMandatory : undefined,
    page: getPositiveInteger(search.page),
  };
}

export function getTransactionFiltersFromSearch(
  search: TransactionsRouteSearch,
): TransactionFiltersValue {
  return {
    ...DEFAULT_TRANSACTION_FILTERS,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
    categoryId: search.categoryId,
    accountId: search.accountId,
    search: search.search,
    isMandatory: search.isMandatory,
    page: search.page ?? DEFAULT_TRANSACTION_FILTERS.page,
  };
}

export function getTransactionsRouteSearch(
  filters: TransactionFiltersValue,
): TransactionsRouteSearch {
  return {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    categoryId: filters.categoryId || undefined,
    accountId: filters.accountId || undefined,
    search: filters.search?.trim() || undefined,
    isMandatory: filters.isMandatory,
    page:
      filters.page > DEFAULT_TRANSACTION_FILTERS.page
        ? filters.page
        : undefined,
  };
}
