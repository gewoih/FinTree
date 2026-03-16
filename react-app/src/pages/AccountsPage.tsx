import { useMutation, useQuery } from '@tanstack/react-query';
import { Wallet, Inbox } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import * as accountsApi from '@/api/accounts';
import { queryKeys } from '@/api/queryKeys';
import { getCurrencies } from '@/api/user';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataStateWrapper, type DataState } from '@/components/common/DataStateWrapper';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth/session';
import { resolveApiErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';
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
  const currentUser = useCurrentUser();
  const isReadOnlyMode = currentUser?.subscription?.isReadOnlyMode ?? false;
  const [view, setView] = useState<AccountsView>('active');
  const [searchInput, setSearchInput] = useState('');
  const [editingAccount, setEditingAccount] = useState<ManagedAccount | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ManagedAccount | null>(null);

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

  const activeBankAccounts = sortAccounts(
    (accountsQuery.data ?? []).map((account) =>
      normalizeAccount(account, currenciesQuery.data)
    )
  );
  const archivedBankAccounts = sortAccounts(
    (archivedAccountsQuery.data ?? []).map((account) =>
      normalizeAccount(account, currenciesQuery.data)
    )
  );
  const currentSourceAccounts = view === 'active' ? activeBankAccounts : archivedBankAccounts;
  const currentAccounts = filterAccounts(currentSourceAccounts, searchInput);

  const currentError =
    currenciesQuery.error ??
    (view === 'active' ? accountsQuery.error : archivedAccountsQuery.error);
  const isCurrentViewLoading =
    view === 'active' ? accountsQuery.isLoading : archivedAccountsQuery.isLoading;
  const isLoading =
    currenciesQuery.isLoading ||
    (isCurrentViewLoading && currentSourceAccounts.length === 0);
  const hasSearch = searchInput.trim().length > 0;
  const hasVisibleAccounts = currentSourceAccounts.length > 0;
  const showInlineError = Boolean(currentError) && hasVisibleAccounts;
  const showBlockingError = Boolean(currentError) && !hasVisibleAccounts && !isLoading;
  const compactGridMaxWidth =
    currentAccounts.length < 3
      ? `${currentAccounts.length * 360 + Math.max(currentAccounts.length - 1, 0) * 16}px`
      : undefined;

  const activeCount = activeBankAccounts.length;
  const archivedCount = archivedBankAccounts.length;

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

  const handleRetry = () => {
    void currenciesQuery.refetch();
    void accountsQuery.refetch();
    void archivedAccountsQuery.refetch();
  };

  const contentState: DataState = isLoading
    ? 'loading'
    : showBlockingError
      ? 'error'
      : currentAccounts.length === 0
        ? 'empty'
        : 'success';

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8">
        <PageHeader
          title="Счета"
          className="mb-0"
          actions={
            !isReadOnlyMode ? (
              <Button
                className="min-h-[44px] rounded-lg px-5 shadow-[var(--ft-shadow-sm)]"
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
          activeCount={activeCount}
          archivedCount={archivedCount}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onViewChange={setView}
        />

        {showInlineError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            <div className="font-medium text-foreground">Не удалось обновить счета</div>
            <div className="mt-1 text-muted-foreground">
              {resolveApiErrorMessage(currentError, 'Попробуйте повторить запрос.')}
            </div>
            <Button className="mt-3 min-h-[44px]" variant="outline" onClick={handleRetry}>
              Повторить
            </Button>
          </div>
        ) : null}

        <DataStateWrapper
          state={contentState}
          errorTitle="Не удалось загрузить счета"
          error={
            currentError
              ? resolveApiErrorMessage(currentError, 'Попробуйте повторить запрос.')
              : null
          }
          onRetry={handleRetry}
          loadingFallback={(
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-[184px] rounded-xl" />
              ))}
            </div>
          )}
          emptyFallback={
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
                description="Добавьте банковский счёт, чтобы начать отслеживать баланс и операции."
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
          }
        >
          <div
            className={cn(
              'grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
              currentAccounts.length < 3 && 'justify-start',
            )}
            style={{ maxWidth: compactGridMaxWidth }}
          >
            {currentAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                readonly={view === 'archived'}
                interactionLocked={isReadOnlyMode}
                isPrimaryLoading={
                  setPrimaryMutation.isPending &&
                  setPrimaryMutation.variables === account.id
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
              />
            ))}
          </div>
        </DataStateWrapper>

        <AccountFormModal
          open={isFormOpen}
          account={editingAccount}
          currencies={currenciesQuery.data ?? []}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setEditingAccount(null);
          }}
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
