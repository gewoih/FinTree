import { useMutation, useQuery } from '@tanstack/react-query';
import { Wallet, Inbox } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import * as accountsApi from '@/api/accounts';
import { queryKeys } from '@/api/queryKeys';
import { getCurrencies } from '@/api/user';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useUserStore } from '@/stores/userStore';
import { resolveApiErrorMessage } from '@/utils/errors';
import { AccountBalanceAdjustmentsModal } from '@/features/accounts/AccountBalanceAdjustmentsModal';
import { AccountCard } from '@/features/accounts/AccountCard';
import { AccountFormModal } from '@/features/accounts/AccountFormModal';
import { AccountsToolbar } from '@/features/accounts/AccountsToolbar';
import type { ManagedAccount, AccountsView } from '@/features/accounts/accountModels';
import {
  filterAccounts,
  normalizeAccount,
  sortAccounts,
} from '@/features/accounts/accountUtils';

const SKELETON_KEYS = ['one', 'two', 'three', 'four'];

export default function AccountsPage() {
  const currentUser = useUserStore((state) => state.currentUser);
  const baseCurrencyCode = currentUser?.baseCurrencyCode ?? 'RUB';
  const isReadOnlyMode = currentUser?.subscription?.isReadOnlyMode ?? false;
  const [view, setView] = useState<AccountsView>('active');
  const [searchInput, setSearchInput] = useState('');
  const [editingAccount, setEditingAccount] = useState<ManagedAccount | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [adjustmentsAccount, setAdjustmentsAccount] = useState<ManagedAccount | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ManagedAccount | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

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

  const currenciesQuery = useQuery({
    queryKey: queryKeys.currencies(),
    queryFn: getCurrencies,
    staleTime: Infinity,
  });

  const activeAccounts = filterAccounts(
    sortAccounts(
      (accountsQuery.data ?? []).map((account) =>
        normalizeAccount(account, currenciesQuery.data)
      )
    ),
    debouncedSearch
  );
  const archivedAccounts = filterAccounts(
    sortAccounts(
      (archivedAccountsQuery.data ?? []).map((account) =>
        normalizeAccount(account, currenciesQuery.data)
      )
    ),
    debouncedSearch
  );

  const setPrimaryMutation = useMutation({
    mutationFn: accountsApi.setPrimaryAccount,
    onSuccess: async () => {
      await Promise.all([
        accountsQuery.refetch(),
        archivedAccountsQuery.refetch(),
      ]);
      toast.success('Основной счёт обновлён');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось сделать счёт основным.'));
    },
  });

  const liquidityMutation = useMutation({
    mutationFn: ({
      accountId,
      isLiquid,
    }: {
      accountId: string;
      isLiquid: boolean;
    }) => accountsApi.updateAccountLiquidity(accountId, isLiquid),
    onSuccess: async () => {
      await accountsQuery.refetch();
      toast.success('Ликвидность счёта обновлена');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось обновить ликвидность.'));
    },
  });

  const archiveMutation = useMutation({
    mutationFn: accountsApi.archiveAccount,
    onSuccess: async () => {
      setArchiveTarget(null);
      await Promise.all([accountsQuery.refetch(), archivedAccountsQuery.refetch()]);
      toast.success('Счёт архивирован');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось архивировать счёт.'));
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: accountsApi.unarchiveAccount,
    onSuccess: async () => {
      await Promise.all([accountsQuery.refetch(), archivedAccountsQuery.refetch()]);
      toast.success('Счёт возвращён из архива');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось разархивировать счёт.'));
    },
  });

  const currentAccounts = view === 'active' ? activeAccounts : archivedAccounts;
  const currentError =
    currenciesQuery.error ??
    (view === 'active' ? accountsQuery.error : archivedAccountsQuery.error);
  const isLoading =
    currenciesQuery.isLoading ||
    accountsQuery.isLoading ||
    archivedAccountsQuery.isLoading;
  const hasSearch = debouncedSearch.trim().length > 0;

  const handleRetry = () => {
    void currenciesQuery.refetch();
    void accountsQuery.refetch();
    void archivedAccountsQuery.refetch();
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:px-8">
        <PageHeader
          title="Счета"
          actions={
            !isReadOnlyMode ? (
              <Button
                className="min-h-[44px] rounded-full px-5"
                onClick={() => {
                  setEditingAccount(null);
                  setIsFormOpen(true);
                }}
              >
                Добавить счёт
              </Button>
            ) : undefined
          }
        />

        <AccountsToolbar
          view={view}
          activeCount={accountsQuery.data?.length ?? 0}
          archivedCount={archivedAccountsQuery.data?.length ?? 0}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onViewChange={setView}
        />

        {currentError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <div className="font-medium text-foreground">Не удалось загрузить счета</div>
            <div className="mt-1 text-muted-foreground">
              {resolveApiErrorMessage(currentError, 'Попробуйте повторить запрос.')}
            </div>
            <Button className="mt-3 min-h-[44px]" variant="outline" onClick={handleRetry}>
              Повторить
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-[220px] rounded-3xl" />
            ))}
          </div>
        ) : currentAccounts.length === 0 ? (
          hasSearch ? (
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте изменить запрос или сбросить поиск."
              action={{ label: 'Сбросить фильтры', onClick: () => setSearchInput('') }}
            />
          ) : view === 'active' ? (
            <EmptyState
              icon={<Wallet />}
              title="Нет активных счетов"
              description="Добавьте счёт, чтобы начать отслеживать баланс и операции."
              action={
                isReadOnlyMode
                  ? undefined
                  : {
                      label: 'Добавить счёт',
                      onClick: () => {
                        setEditingAccount(null);
                        setIsFormOpen(true);
                      },
                    }
              }
            />
          ) : (
            <EmptyState
              icon={<Inbox />}
              title="Архив пуст"
              description="Здесь будут отображаться архивированные счета."
              action={{ label: 'К активным счетам', onClick: () => setView('active') }}
            />
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {currentAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                baseCurrencyCode={baseCurrencyCode}
                readonly={view === 'archived'}
                interactionLocked={isReadOnlyMode}
                isPrimaryLoading={
                  setPrimaryMutation.isPending &&
                  setPrimaryMutation.variables === account.id
                }
                isLiquidityLoading={
                  liquidityMutation.isPending &&
                  liquidityMutation.variables?.accountId === account.id
                }
                isArchiveLoading={
                  (archiveMutation.isPending && archiveMutation.variables === account.id) ||
                  (unarchiveMutation.isPending &&
                    unarchiveMutation.variables === account.id)
                }
                onSetPrimary={() => setPrimaryMutation.mutate(account.id)}
                onEdit={() => {
                  setEditingAccount(account);
                  setIsFormOpen(true);
                }}
                onArchive={() => setArchiveTarget(account)}
                onUnarchive={() => unarchiveMutation.mutate(account.id)}
                onAdjustBalance={() => setAdjustmentsAccount(account)}
                onLiquidityChange={(isLiquid) =>
                  liquidityMutation.mutate({ accountId: account.id, isLiquid })
                }
              />
            ))}
          </div>
        )}

        <AccountFormModal
          open={isFormOpen}
          account={editingAccount}
          currencies={currenciesQuery.data ?? []}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setEditingAccount(null);
          }}
        />

        <AccountBalanceAdjustmentsModal
          open={adjustmentsAccount !== null}
          account={adjustmentsAccount}
          readonly={isReadOnlyMode}
          onClose={() => setAdjustmentsAccount(null)}
        />

        <ConfirmDialog
          open={archiveTarget !== null}
          onOpenChange={(isOpen) => !isOpen && setArchiveTarget(null)}
          title={archiveTarget ? `Архивировать счет «${archiveTarget.name}»?` : 'Архивировать счёт'}
          description="Счёт будет скрыт из активных операций, но история сохранится."
          confirmLabel="Архивировать"
          isLoading={archiveMutation.isPending}
          onConfirm={() => {
            if (archiveTarget) {
              archiveMutation.mutate(archiveTarget.id);
            }
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
