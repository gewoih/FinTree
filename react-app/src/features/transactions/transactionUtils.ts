import type {
  AccountDto,
  TransactionCategoryDto,
  TransactionDto,
  TransactionsQuery,
  UpdateTransferPayload,
} from '@/types';
import { formatDateLong, normalizeAccountType } from '@/utils/format';
import { getCategoryColorToken } from '@/utils/categoryPalette';
import type {
  TransactionDisplayRow,
  TransactionFiltersValue,
} from './transactionModels';
import { normalizeCategoryIconKey } from '@/features/categories/categoryIcons';

export function toTransactionsQuery(
  filters: TransactionFiltersValue
): TransactionsQuery {
  return {
    accountId: filters.accountId ?? null,
    categoryId: filters.categoryId ?? null,
    from: filters.dateFrom ?? null,
    to: filters.dateTo ?? null,
    search: filters.search ?? null,
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
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}

export function getTodayDateValue(): string {
  return toDateInputValue(new Date().toISOString());
}

export function isFutureDateValue(dateValue: string): boolean {
  return dateValue > getTodayDateValue();
}

export function buildTransferPayload(
  transferId: string,
  transactions: TransactionDto[]
): UpdateTransferPayload | null {
  const related = transactions.filter((item) => item.transferId === transferId);
  const expenseTransfer = related.find(
    (item) => item.isTransfer && item.type === 'Expense'
  );
  const incomeTransfer = related.find(
    (item) => item.isTransfer && item.type === 'Income'
  );
  const feeTransaction = related.find((item) => !item.isTransfer);

  if (!expenseTransfer || !incomeTransfer) {
    return null;
  }

  return {
    transferId,
    fromAccountId: expenseTransfer.accountId,
    toAccountId: incomeTransfer.accountId,
    fromAmount: expenseTransfer.amount,
    toAmount: incomeTransfer.amount,
    occurredAt: expenseTransfer.occurredAt,
    feeAmount: feeTransaction?.amount ?? null,
    description:
      expenseTransfer.description ??
      incomeTransfer.description ??
      feeTransaction?.description ??
      null,
  };
}

export function buildTransactionRows(
  transactions: TransactionDto[],
  accounts: AccountDto[],
  categories: TransactionCategoryDto[]
): TransactionDisplayRow[] {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const seenTransferIds = new Set<string>();
  const rows: TransactionDisplayRow[] = [];

  for (const transaction of transactions) {
    if (transaction.transferId) {
      if (seenTransferIds.has(transaction.transferId)) {
        continue;
      }

      seenTransferIds.add(transaction.transferId);
      const related = transactions.filter(
        (item) => item.transferId === transaction.transferId
      );
      const expenseTransfer = related.find(
        (item) => item.isTransfer && item.type === 'Expense'
      );
      const incomeTransfer = related.find(
        (item) => item.isTransfer && item.type === 'Income'
      );
      const feeTransaction = related.find((item) => !item.isTransfer);
      const fromAccount = expenseTransfer
        ? accountById.get(expenseTransfer.accountId)
        : undefined;
      const toAccount = incomeTransfer
        ? accountById.get(incomeTransfer.accountId)
        : undefined;

      rows.push({
        kind: 'transfer',
        id: transaction.transferId,
        transferId: transaction.transferId,
        occurredAt: transaction.occurredAt,
        title:
          transaction.description?.trim() ||
          `Перевод${fromAccount && toAccount ? ` · ${fromAccount.name} → ${toAccount.name}` : ''}`,
        caption: feeTransaction
          ? `Комиссия ${feeTransaction.amount.toLocaleString('ru-RU')} ${
              fromAccount?.currencyCode ?? feeTransaction.originalCurrencyCode ?? ''
            }`
          : null,
        accountName:
          fromAccount && toAccount
            ? `${fromAccount.name} → ${toAccount.name}`
            : 'Перевод между счетами',
        primaryAmount: expenseTransfer?.amount ?? transaction.amount,
        primaryCurrencyCode:
          fromAccount?.currencyCode ??
          expenseTransfer?.originalCurrencyCode ??
          'RUB',
        secondaryAmount: incomeTransfer?.amount ?? null,
        secondaryCurrencyCode:
          toAccount?.currencyCode ?? incomeTransfer?.originalCurrencyCode ?? null,
        feeAmount: feeTransaction?.amount ?? null,
      });
      continue;
    }

    const account = accountById.get(transaction.accountId);
    const category = categoryById.get(transaction.categoryId);

    rows.push({
      kind: 'transaction',
      id: transaction.id,
      occurredAt: transaction.occurredAt,
      title: transaction.description?.trim() || category?.name || 'Без описания',
      caption: transaction.description?.trim() ? category?.name ?? null : null,
      accountName: account?.name ?? 'Счёт недоступен',
      amount: transaction.amount,
      currencyCode: account?.currencyCode ?? transaction.originalCurrencyCode ?? 'RUB',
      tone: transaction.type === 'Income' ? 'Income' : 'Expense',
      categoryName: category?.name ?? 'Без категории',
      categoryColor: getCategoryColorToken(category?.id ?? category?.name ?? 'uncategorized'),
      categoryIcon: normalizeCategoryIconKey(category?.icon),
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
  ].filter(Boolean).length;
}

export function getTransferLookupDate(occurredAt: string): string {
  return toDateInputValue(occurredAt);
}

export function getExpenseSummaryAmount(transactions: TransactionDto[]): number {
  return transactions.reduce((sum, item) => {
    if (item.isTransfer || item.type !== 'Expense') {
      return sum;
    }

    return sum + (item.amountInBaseCurrency ?? item.amount);
  }, 0);
}

export function isActiveAccount(account: AccountDto): boolean {
  return !account.isArchived && normalizeAccountType(account.type) >= 0;
}
