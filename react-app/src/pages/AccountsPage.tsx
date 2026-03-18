import { Wallet, Inbox } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataStateWrapper } from '@/components/common/DataStateWrapper';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { resolveApiErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';
import { AccountCard } from '@/features/accounts/AccountCard';
import { AccountFormModal } from '@/features/accounts/AccountFormModal';
import { AccountsToolbar } from '@/features/accounts/AccountsToolbar';
import { useAccountsPage } from '@/features/accounts/useAccountsPage';

const SKELETON_KEYS = ['one', 'two', 'three', 'four'];

export default function AccountsPage() {
  const {
    activeCount,
    archiveMutation,
    archiveTarget,
    archivedCount,
    compactGridMaxWidth,
    contentState,
    currentAccounts,
    currentError,
    currencies,
    editingAccount,
    handleRetry,
    hasSearch,
    isFormOpen,
    isReadOnlyMode,
    searchInput,
    setArchiveTarget,
    setEditingAccount,
    setIsFormOpen,
    setSearchInput,
    setView,
    setPrimaryMutation,
    showInlineError,
    unarchiveMutation,
    view,
  } = useAccountsPage();

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
          currencies={currencies}
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
