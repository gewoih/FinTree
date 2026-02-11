import { ref, computed } from 'vue';
import type { Account, Category, Transaction } from '../types';

type ExtendedTransaction = Transaction & {
  categoryName?: string;
  accountName?: string;
  isTransferSummary?: boolean;
  transferFromAccountId?: string;
  transferToAccountId?: string;
};

/**
 * Composable for managing transaction filters
 * Handles search text, category, account, and date range filtering
 *
 * @param transactions - Computed ref containing the transactions to filter
 * @returns Filter state refs and computed filtered transactions
 */
export function useTransactionFilters<T extends Transaction>(
  transactions: () => T[]
) {
  const searchText = ref('');
  const selectedCategory = ref<Category | null>(null);
  const selectedAccount = ref<Account | null>(null);

  const getCurrentMonthRange = (): [Date, Date] => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return [start, end];
  };

  const dateRange = ref<Date[] | null>(getCurrentMonthRange());

  /**
   * Filters transactions based on all active filter criteria
   */
  const filteredTransactions = computed(() => {
    let filtered = transactions();

    // Search by text (category name, account name, description)
    if (searchText.value) {
      const search = searchText.value.toLowerCase();
      filtered = filtered.filter(txn => {
        const extendedTxn = txn as ExtendedTransaction;
        const categoryName = extendedTxn.categoryName ?? extendedTxn.category?.name ?? '';
        const accountName = extendedTxn.accountName ?? extendedTxn.account?.name ?? '';
        const description = txn.description ?? '';

        return (
          categoryName.toLowerCase().includes(search) ||
          accountName.toLowerCase().includes(search) ||
          description.toLowerCase().includes(search)
        );
      });
    }

    // Filter by category
    if (selectedCategory.value) {
      filtered = filtered.filter(txn => {
        if ((txn as ExtendedTransaction).isTransferSummary) return false;
        return txn.categoryId === selectedCategory.value!.id;
      });
    }

    // Filter by account
    if (selectedAccount.value) {
      filtered = filtered.filter(txn => {
        const extendedTxn = txn as ExtendedTransaction;
        if (extendedTxn.isTransferSummary) {
          const fromId = extendedTxn.transferFromAccountId;
          const toId = extendedTxn.transferToAccountId;
          return fromId === selectedAccount.value!.id || toId === selectedAccount.value!.id;
        }
        return txn.accountId === selectedAccount.value!.id;
      });
    }

    // Filter by date range
    if (dateRange.value && dateRange.value.length === 2) {
      const [startDate, endDate] = dateRange.value as [Date, Date];

      // Set time to start and end of day for accurate comparison
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      filtered = filtered.filter(txn => {
        const txnDate = new Date(txn.occurredAt);
        return txnDate >= startOfDay && txnDate <= endOfDay;
      });
    }

    return filtered;
  });

  /**
   * Clears all active filters
   */
  const clearFilters = () => {
    searchText.value = '';
    selectedCategory.value = null;
    selectedAccount.value = null;
    dateRange.value = getCurrentMonthRange();
  };

  return {
    searchText,
    selectedCategory,
    selectedAccount,
    dateRange,
    filteredTransactions,
    clearFilters
  };
}
