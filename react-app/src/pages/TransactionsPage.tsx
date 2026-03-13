import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import * as accountsApi from '@/api/accounts';
import { getCategories } from '@/api/categories';
import { queryKeys } from '@/api/queryKeys';
import * as transactionsApi from '@/api/transactions';
import * as transfersApi from '@/api/transfers';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useUserStore } from '@/stores/userStore';
import type { AccountDto, TransactionDto } from '@/types';
import { resolveApiErrorMessage } from '@/utils/errors';
import { TransactionFilters } from '@/features/transactions/TransactionFilters';
import { TransactionFormModal } from '@/features/transactions/TransactionFormModal';
import { TransactionList } from '@/features/transactions/TransactionList';
import {
  DEFAULT_TRANSACTION_FILTERS,
  type TransactionModalMode,
} from '@/features/transactions/transactionModels';
import {
  buildTransferPayload,
  getExpenseSummaryAmount,
  getTransferLookupDate,
  toTransactionsQuery,
} from '@/features/transactions/transactionUtils';

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

function getInitialTransactionFilters() {
  if (typeof window === 'undefined') {
    return DEFAULT_TRANSACTION_FILTERS;
  }

  const params = new URLSearchParams(window.location.search);
  const dateFrom = params.get('dateFrom')?.trim() || undefined;
  const dateTo = params.get('dateTo')?.trim() || undefined;
  const categoryId = params.get('categoryId')?.trim() || undefined;
  const accountId = params.get('accountId')?.trim() || undefined;
  const search = params.get('search')?.trim() || undefined;

  return {
    ...DEFAULT_TRANSACTION_FILTERS,
    dateFrom,
    dateTo,
    categoryId,
    accountId,
    search,
  };
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const currentUser = useUserStore((state) => state.currentUser);
  const baseCurrencyCode = currentUser?.baseCurrencyCode ?? 'RUB';
  const isReadOnlyMode = currentUser?.subscription?.isReadOnlyMode ?? false;
  const [filters, setFilters] = useState(getInitialTransactionFilters);
  const [modalMode, setModalMode] = useState<TransactionModalMode>({ type: 'closed' });
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
        })
      ),
    placeholderData: keepPreviousData,
  });

  const summaryQuery = useQuery({
    queryKey: ['transactions', 'summary', filters.dateFrom, filters.dateTo, filters.accountId, filters.categoryId, debouncedSearch],
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

  const handleFiltersChange = useCallback((nextFilters: Partial<typeof filters>) => {
    setFilters((current) => {
      const shouldResetPage = Object.keys(nextFilters).some(
        (key) => key !== 'page' && key !== 'pageSize'
      );

      return {
        ...current,
        ...nextFilters,
        page:
          nextFilters.page ??
          (shouldResetPage ? DEFAULT_TRANSACTION_FILTERS.page : current.page),
      };
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_TRANSACTION_FILTERS);
  }, []);

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.deleteTransaction(id),
    onSuccess: async () => {
      await Promise.all([
        transactionsQuery.refetch(),
        accountsQuery.refetch(),
        archivedAccountsQuery.refetch(),
      ]);
      toast.success('Транзакция удалена');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось удалить транзакцию.'));
    },
  });

  const deleteTransferMutation = useMutation({
    mutationFn: (transferId: string) => transfersApi.deleteTransfer(transferId),
    onSuccess: async () => {
      await Promise.all([
        transactionsQuery.refetch(),
        accountsQuery.refetch(),
        archivedAccountsQuery.refetch(),
      ]);
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
        transactionsQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() }),
      ]);
      toast.success(
        variables.isMandatory
          ? 'Помечено как обязательное'
          : 'Отмечено как необязательное'
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
        !activeAccounts.some((activeAccount) => activeAccount.id === archivedAccount.id)
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
          'Транзакция связана с архивным счётом и недоступна для редактирования.'
        );
        return;
      }

      setModalMode({ type: 'edit-transaction', transaction });
    },
    [activeAccounts, isReadOnlyMode]
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
    [activeAccounts, isReadOnlyMode, transactionsQuery.data?.items]
  );

  const deletingId = deleteTransactionMutation.isPending
    ? ((deleteTransactionMutation.variables as string | undefined) ?? null)
    : deleteTransferMutation.isPending
      ? ((deleteTransferMutation.variables as string | undefined) ?? null)
      : null;

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:px-8">
        <PageHeader
          title="Транзакции"
          actions={
            !isReadOnlyMode ? (
              <Button
                className="min-h-[44px] rounded-lg px-5"
                onClick={() => setModalMode({ type: 'create' })}
              >
                Добавить
              </Button>
            ) : undefined
          }
        />

        {!isReady ? (
          <div className="mx-auto w-full max-w-[960px] space-y-3 rounded-xl border border-border bg-card/70 p-4">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : setupError ? (
          <div className="mx-auto w-full max-w-[960px] rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <div className="font-medium text-foreground">Не удалось подготовить страницу</div>
            <div className="mt-1 text-muted-foreground">
              {resolveApiErrorMessage(setupError, 'Попробуйте повторить запрос.')}
            </div>
            <Button
              className="mt-3 min-h-[44px]"
              variant="outline"
              onClick={() => {
                void accountsQuery.refetch();
                void archivedAccountsQuery.refetch();
                void categoriesQuery.refetch();
              }}
            >
              Повторить
            </Button>
          </div>
        ) : (
          <>
            <TransactionFilters
              value={filters}
              accounts={activeAccounts}
              categories={categories}
              onChange={handleFiltersChange}
              onClear={handleClearFilters}
            />

            {summaryQuery.data != null ? (
              <div className="mx-auto w-full max-w-[960px] rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Итого расходов:{' '}
                <span className="font-semibold text-foreground [font-variant-numeric:tabular-nums]">
                  {summaryQuery.data.toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {baseCurrencyCode}
                </span>
              </div>
            ) : null}

            <TransactionList
              data={transactionsQuery.data}
              accounts={allAccounts}
              categories={categories}
              loading={transactionsQuery.isLoading}
              baseCurrencyCode={baseCurrencyCode}
              error={
                transactionsQuery.error
                  ? resolveApiErrorMessage(
                      transactionsQuery.error,
                      'Не удалось загрузить транзакции.'
                    )
                  : null
              }
              filters={filters}
              readonly={isReadOnlyMode}
              deletingId={deletingId}
              togglingMandatoryId={
                toggleMandatoryMutation.isPending
                  ? ((toggleMandatoryMutation.variables as { id?: string } | undefined)?.id ??
                    null)
                  : null
              }
              onFiltersChange={handleFiltersChange}
              onAdd={() => setModalMode({ type: 'create' })}
              onEdit={handleEditTransaction}
              onEditTransfer={(transferId, occurredAt) => {
                void handleEditTransfer(transferId, occurredAt);
              }}
              onToggleMandatory={(transaction, isMandatory) =>
                toggleMandatoryMutation.mutate({
                  id: transaction.id,
                  accountId: transaction.accountId,
                  categoryId: transaction.categoryId,
                  amount: transaction.amount,
                  occurredAt: transaction.occurredAt,
                  description: transaction.description ?? null,
                  isMandatory,
                })
              }
              onDeleteTransaction={(transaction) =>
                deleteTransactionMutation.mutate(transaction.id)
              }
              onDeleteTransfer={(transferId) =>
                deleteTransferMutation.mutate(transferId)
              }
              onRetry={() => void transactionsQuery.refetch()}
              onClear={handleClearFilters}
            />
          </>
        )}

        {modalMode.type !== 'closed' ? (
          <TransactionFormModal
            open
            mode={modalMode}
            accounts={activeAccounts}
            categories={categories}
            readonly={isReadOnlyMode}
            onClose={() => setModalMode({ type: 'closed' })}
            onSuccess={() => setModalMode({ type: 'closed' })}
          />
        ) : null}
      </div>
    </ErrorBoundary>
  );
}
