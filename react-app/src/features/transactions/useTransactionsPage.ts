import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import * as accountsApi from '@/api/accounts';
import { getCategories } from '@/api/categories';
import { queryKeys } from '@/api/queryKeys';
import * as transactionsApi from '@/api/transactions';
import * as transfersApi from '@/api/transfers';
import { useCurrentUser } from '@/features/auth/session';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PATHS, ROUTE_IDS } from '@/router/paths';
import type { AccountDto, TransactionDto } from '@/types';
import { resolveApiErrorMessage } from '@/utils/errors';
import {
  DEFAULT_TRANSACTION_FILTERS,
  type TransactionModalMode,
} from './transactionModels';
import {
  getTransactionFiltersFromSearch,
  getTransactionsRouteSearch,
} from './transactionSearch';
import {
  buildTransferPayload,
  getExpenseSummaryAmount,
  getTransferLookupDate,
  toTransactionsQuery,
} from './transactionUtils';

async function loadAllTransactions(filters: ReturnType<typeof toTransactionsQuery>) {
  const items = [];
  let page = 1;
  let total = 0;

  do {
    const result = await transactionsApi.getTransactions({
      ...filters,
      page,
      size: 200,
    });

    items.push(...result.items);
    total = result.total;
    page += 1;
  } while (items.length < total);

  return items;
}

const EMPTY_ACCOUNTS: AccountDto[] = [];

export function useTransactionsPage() {
  const navigate = useNavigate();
  const routeSearch = useSearch({ from: ROUTE_IDS.TRANSACTIONS });
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const baseCurrencyCode = currentUser?.baseCurrencyCode ?? 'RUB';
  const isReadOnlyMode = currentUser?.subscription?.isReadOnlyMode ?? false;
  const [modalMode, setModalMode] = useState<TransactionModalMode>({ type: 'closed' });
  const filters = useMemo(
    () => getTransactionFiltersFromSearch(routeSearch),
    [routeSearch],
  );
  const debouncedSearch = useDebouncedValue(filters.search ?? '', 400);

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts.active(),
    queryFn: () => accountsApi.getAccounts(false),
    staleTime: 30_000,
  });

  const archivedAccountsQuery = useQuery({
    queryKey: queryKeys.accounts.archived(),
    queryFn: () => accountsApi.getAccounts(true),
    staleTime: 30_000,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: getCategories,
    staleTime: 60_000,
  });

  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions.list({
      ...filters,
      search: debouncedSearch || undefined,
    }),
    queryFn: () =>
      transactionsApi.getTransactions(
        toTransactionsQuery({
          ...filters,
          search: debouncedSearch || undefined,
        }),
      ),
    placeholderData: keepPreviousData,
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.transactions.summary({
      from: filters.dateFrom,
      to: filters.dateTo,
      accountId: filters.accountId,
      categoryId: filters.categoryId,
      search: debouncedSearch || undefined,
    }),
    enabled: Boolean(filters.dateFrom || filters.dateTo),
    queryFn: async () => {
      const items = await loadAllTransactions({
        ...toTransactionsQuery({
          ...filters,
          search: debouncedSearch || undefined,
        }),
        page: 1,
        size: 200,
      });
      return getExpenseSummaryAmount(items);
    },
  });

  const invalidateTransactionData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() }),
    ]);
  }, [queryClient]);

  const handleFiltersChange = useCallback((nextFilters: Partial<typeof filters>) => {
    const shouldResetPage = Object.keys(nextFilters).some(
      (key) => key !== 'page' && key !== 'pageSize',
    );
    const nextState = {
      ...filters,
      ...nextFilters,
      page:
        nextFilters.page ??
        (shouldResetPage ? DEFAULT_TRANSACTION_FILTERS.page : filters.page),
    };
    const shouldReplaceHistory = 'search' in nextFilters || 'page' in nextFilters;

    void navigate({
      to: PATHS.TRANSACTIONS,
      search: getTransactionsRouteSearch(nextState),
      replace: shouldReplaceHistory,
    });
  }, [filters, navigate]);

  const handleClearFilters = useCallback(() => {
    void navigate({
      to: PATHS.TRANSACTIONS,
      search: getTransactionsRouteSearch(DEFAULT_TRANSACTION_FILTERS),
    });
  }, [navigate]);

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.deleteTransaction(id),
    onSuccess: async () => {
      await invalidateTransactionData();
      toast.success('Транзакция удалена');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось удалить транзакцию.'));
    },
  });

  const deleteTransferMutation = useMutation({
    mutationFn: (transferId: string) => transfersApi.deleteTransfer(transferId),
    onSuccess: async () => {
      await invalidateTransactionData();
      toast.success('Перевод удалён');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось удалить перевод.'));
    },
  });

  const toggleMandatoryMutation = useMutation({
    mutationFn: transactionsApi.updateTransaction,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() }),
      ]);
      toast.success(
        variables.isMandatory
          ? 'Помечено как обязательное'
          : 'Отмечено как необязательное',
      );
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось обновить обязательность.'));
    },
  });

  const activeAccounts = accountsQuery.data ?? EMPTY_ACCOUNTS;
  const allAccounts = [
    ...activeAccounts,
    ...(archivedAccountsQuery.data ?? []).filter(
      (archivedAccount) =>
        !activeAccounts.some((activeAccount) => activeAccount.id === archivedAccount.id),
    ),
  ];
  const categories = categoriesQuery.data ?? [];
  const setupError = accountsQuery.error ?? categoriesQuery.error ?? archivedAccountsQuery.error;
  const isReady =
    accountsQuery.isSuccess &&
    categoriesQuery.isSuccess &&
    archivedAccountsQuery.isSuccess;

  const handleEditTransaction = useCallback(
    (transaction: TransactionDto) => {
      if (isReadOnlyMode) {
        return;
      }

      if (!activeAccounts.some((account) => account.id === transaction.accountId)) {
        toast.error(
          'Транзакция связана с архивным счётом и недоступна для редактирования.',
        );
        return;
      }

      setModalMode({ type: 'edit-transaction', transaction });
    },
    [activeAccounts, isReadOnlyMode],
  );

  const handleEditTransfer = useCallback(
    async (transferId: string, occurredAt: string) => {
      if (isReadOnlyMode) {
        return;
      }

      let payload = buildTransferPayload(transferId, transactionsQuery.data?.items ?? []);

      if (!payload) {
        const lookupDate = getTransferLookupDate(occurredAt);
        const lookupItems = await loadAllTransactions({
          from: lookupDate,
          to: lookupDate,
          page: 1,
          size: 200,
        });
        payload = buildTransferPayload(transferId, lookupItems);
      }

      if (!payload) {
        toast.error('Не удалось восстановить данные перевода для редактирования.');
        return;
      }

      const canEditTransfer =
        activeAccounts.some((account) => account.id === payload.fromAccountId) &&
        activeAccounts.some((account) => account.id === payload.toAccountId);

      if (!canEditTransfer) {
        toast.error('Перевод связан с архивным счётом и недоступен для редактирования.');
        return;
      }

      setModalMode({ type: 'edit-transfer', payload });
    },
    [activeAccounts, isReadOnlyMode, transactionsQuery.data?.items],
  );

  const deletingId = deleteTransactionMutation.isPending
    ? ((deleteTransactionMutation.variables as string | undefined) ?? null)
    : deleteTransferMutation.isPending
      ? ((deleteTransferMutation.variables as string | undefined) ?? null)
      : null;

  const togglingMandatoryId = toggleMandatoryMutation.isPending
    ? ((toggleMandatoryMutation.variables as { id?: string } | undefined)?.id ?? null)
    : null;

  const retrySetup = useCallback(() => {
    void accountsQuery.refetch();
    void archivedAccountsQuery.refetch();
    void categoriesQuery.refetch();
  }, [accountsQuery, archivedAccountsQuery, categoriesQuery]);

  const openCreateModal = useCallback(() => {
    setModalMode({ type: 'create' });
  }, []);

  const closeModal = useCallback(() => {
    setModalMode({ type: 'closed' });
  }, []);

  return {
    activeAccounts,
    allAccounts,
    baseCurrencyCode,
    categories,
    closeModal,
    deletingId,
    filters,
    handleClearFilters,
    handleEditTransaction,
    handleEditTransfer,
    handleFiltersChange,
    isReadOnlyMode,
    isReady,
    modalMode,
    openCreateModal,
    retrySetup,
    setModalMode,
    setupError,
    summaryAmount: summaryQuery.data ?? null,
    togglingMandatoryId,
    transactionsData: transactionsQuery.data,
    transactionsError: transactionsQuery.error,
    transactionsLoading: transactionsQuery.isLoading,
    retryTransactions: () => void transactionsQuery.refetch(),
    toggleMandatory: (transaction: TransactionDto, isMandatory: boolean) =>
      toggleMandatoryMutation.mutate({
        id: transaction.id,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        amount: transaction.amount,
        occurredAt: transaction.occurredAt,
        description: transaction.description ?? null,
        isMandatory,
      }),
    deleteTransaction: async (transaction: TransactionDto) => {
      await deleteTransactionMutation.mutateAsync(transaction.id);
    },
    deleteTransfer: async (transferId: string) => {
      await deleteTransferMutation.mutateAsync(transferId);
    },
  };
}
