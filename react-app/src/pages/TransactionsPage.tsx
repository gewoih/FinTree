import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { resolveApiErrorMessage } from '@/utils/errors';
import { TransactionFilters } from '@/features/transactions/TransactionFilters';
import { TransactionFormModal } from '@/features/transactions/TransactionFormModal';
import { TransactionList } from '@/features/transactions/TransactionList';
import { useTransactionsPage } from '@/features/transactions/useTransactionsPage';

export default function TransactionsPage() {
  const {
    activeAccounts,
    allAccounts,
    baseCurrencyCode,
    categories,
    closeModal,
    deleteTransaction,
    deletingId,
    filters,
    handleClearFilters,
    handleEditTransaction,
    handleFiltersChange,
    isReadOnlyMode,
    isReady,
    modalMode,
    openCreateModal,
    retrySetup,
    setupError,
    summaryAmount,
    toggleMandatory,
    togglingMandatoryId,
    transactionsData,
    transactionsError,
    transactionsLoading,
    retryTransactions,
  } = useTransactionsPage();
  const activeModalDeleteId =
    modalMode.type === 'edit-transaction' ? modalMode.transaction.id : null;

  return (
    <ErrorBoundary>
      <div className="p-4 sm:p-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6">
          <PageHeader
            title="Транзакции"
            actions={
              !isReadOnlyMode ? (
                <Button
                  className="min-h-[44px] rounded-lg px-5"
                  onClick={openCreateModal}
                >
                  Добавить
                </Button>
              ) : undefined
            }
          />

          {!isReady ? (
            <div className="w-full space-y-3 rounded-xl border border-border bg-card/70 p-4">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : setupError ? (
            <div className="w-full rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
              <div className="font-medium text-foreground">Не удалось подготовить страницу</div>
              <div className="mt-1 text-muted-foreground">
                {resolveApiErrorMessage(setupError, 'Попробуйте повторить запрос.')}
              </div>
              <Button
                className="mt-3 min-h-[44px]"
                variant="outline"
                onClick={retrySetup}
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

              {summaryAmount != null ? (
                <div className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Расходы за период:{' '}
                  <span className="font-semibold text-foreground [font-variant-numeric:tabular-nums]">
                    {summaryAmount.toLocaleString('ru-RU', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}{' '}
                    {baseCurrencyCode}
                  </span>
                </div>
              ) : null}

              <TransactionList
                data={transactionsData}
                accounts={allAccounts}
                categories={categories}
                loading={transactionsLoading}
                baseCurrencyCode={baseCurrencyCode}
                error={
                  transactionsError
                    ? resolveApiErrorMessage(
                        transactionsError,
                        'Не удалось загрузить транзакции.',
                      )
                    : null
                }
                filters={filters}
                readonly={isReadOnlyMode}
                togglingMandatoryId={togglingMandatoryId}
                onFiltersChange={handleFiltersChange}
                onAdd={openCreateModal}
                onEdit={handleEditTransaction}
                onToggleMandatory={toggleMandatory}
                onRetry={retryTransactions}
                onClear={handleClearFilters}
              />
            </>
          )}
        </div>

        {modalMode.type !== 'closed' ? (
          <TransactionFormModal
            open
            mode={modalMode}
            accounts={activeAccounts}
            categories={categories}
            readonly={isReadOnlyMode}
            onDeleteTransaction={deleteTransaction}
            isDeletePending={activeModalDeleteId !== null && deletingId === activeModalDeleteId}
            onClose={closeModal}
          />
        ) : null}
      </div>
    </ErrorBoundary>
  );
}
