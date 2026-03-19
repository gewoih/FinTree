import type {
  AccountDto,
  TransactionCategoryDto,
  TransactionDto,
  TransactionsQuery,
} from '@/types';
import { formatDateLong } from '@/utils/format';
import { getCategoryColorToken } from '@/utils/categoryPalette';
import type {
  TransactionDisplayRow,
  TransactionFiltersValue,
} from './transactionModels';
import { normalizeCategoryIconKey } from '@/features/categories/categoryIcons';
import { UNCATEGORIZED_COLOR } from '@/constants/uncategorized';

export function toTransactionsQuery(
  filters: TransactionFiltersValue
): TransactionsQuery {
  return {
    accountId: filters.accountId ?? null,
    categoryId: filters.categoryId ?? null,
    from: filters.dateFrom ?? null,
    to: filters.dateTo ?? null,
    search: filters.search ?? null,
    isMandatory: filters.isMandatory ?? null,
    page: filters.page,
    size: filters.pageSize,
  };
}

export function getDisplayDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function toDateInputValue(value?: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function toIsoDateAtNoon(dateValue: string): string {
  const [year, month, day] = dateValue.split('-').map(Number);
  const today = getTodayDateValue();

  if (dateValue === today) {
    return new Date().toISOString();
  }

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}

export function getTodayDateValue(): string {
  return toDateInputValue(new Date().toISOString());
}

export function buildTransactionRows(
  transactions: TransactionDto[],
  accounts: AccountDto[],
  categories: TransactionCategoryDto[]
): TransactionDisplayRow[] {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const rows: TransactionDisplayRow[] = [];

  for (const transaction of transactions) {
    const account = accountById.get(transaction.accountId);
    const category = transaction.categoryId != null ? categoryById.get(transaction.categoryId) : undefined;
    const isUncategorized = transaction.categoryId == null || category == null;

    rows.push({
      id: transaction.id,
      occurredAt: transaction.occurredAt,
      accountName: account?.name ?? 'Счёт недоступен',
      amount: transaction.amount,
      currencyCode: account?.currencyCode ?? transaction.originalCurrencyCode ?? 'RUB',
      tone: transaction.type === 'Income' ? 'Income' : 'Expense',
      categoryName: isUncategorized ? null : category!.name,
      categoryColor: isUncategorized ? UNCATEGORIZED_COLOR : getCategoryColorToken(category!.id),
      categoryIcon: isUncategorized ? null : normalizeCategoryIconKey(category!.icon),
      transaction,
    });
  }

  return rows;
}

export function groupRowsByDate(rows: TransactionDisplayRow[]) {
  const groups = new Map<string, TransactionDisplayRow[]>();

  for (const row of rows) {
    const key = toDateInputValue(row.occurredAt);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)?.push(row);
  }

  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    dateKey,
    label: dateKey ? formatDateLong(`${dateKey}T12:00:00.000Z`) : 'Без даты',
    items,
  }));
}

export function hasActiveTransactionFilters(filters: TransactionFiltersValue): boolean {
  return countActiveTransactionFilters(filters) > 0;
}

export function countActiveTransactionFilters(filters: TransactionFiltersValue): number {
  return [
    filters.dateFrom,
    filters.dateTo,
    filters.categoryId,
    filters.accountId,
    filters.search,
    filters.isMandatory !== undefined ? 'active' : undefined,
  ].filter(Boolean).length;
}

export function getExpenseSummaryAmount(transactions: TransactionDto[]): number {
  return transactions.reduce((sum, item) => {
    if (item.type !== 'Expense') {
      return sum;
    }

    return sum + (item.amountInBaseCurrency ?? item.amount);
  }, 0);
}

export function getVisiblePages(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}
