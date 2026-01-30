import { ref, computed } from 'vue';
import type { Account, Category, Transaction } from '../types';

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
        const categoryName = txn.category?.name ?? '';
        const accountName = txn.account?.name ?? '';
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
      filtered = filtered.filter(txn => txn.categoryId === selectedCategory.value!.id);
    }

    // Filter by account
    if (selectedAccount.value) {
      filtered = filtered.filter(txn => txn.accountId === selectedAccount.value!.id);
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
