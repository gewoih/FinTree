import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { AccountBalanceAdjustmentsModal } from '@/features/accounts/AccountBalanceAdjustmentsModal';
import { AccountFormModal } from '@/features/accounts/AccountFormModal';
import { InvestmentsAccountsSection } from '@/features/investments/InvestmentsAccountsSection';
import { InvestmentCashFlowModal } from '@/features/investments/InvestmentCashFlowModal';
import { InvestmentsAllocationCard } from '@/features/investments/InvestmentsAllocationCard';
import { InvestmentsSummary } from '@/features/investments/InvestmentsSummary';
import { InvestmentsTrendCard } from '@/features/investments/InvestmentsTrendCard';
import { useInvestmentsPage } from '@/features/investments/useInvestmentsPage';

export default function InvestmentsPage() {
  const {
    activeCount,
    adjustmentsAccount,
    allocationSlices,
    allowedAccountTypes,
    archiveTarget,
    archivedCount,
    accountsErrorMessage,
    accountsLoading,
    baseCurrencyCode,
    canCreateAccount,
    cashFlowModal,
    closeAdjustments,
    closeArchiveDialog,
    closeCashFlowModal,
    closeForm,
    currencies,
    editingAccount,
    filteredAccounts,
    handleAdjustmentSuccess,
    handleArchiveConfirm,
    handleArchiveRequest,
    handleCashFlowSuccess,
    handleEditAccount,
    handleFormSuccess,
    handleLiquidityChange,
    handleOpenAdjustments,
    handleOpenCreateAccount,
    handleOpenDeposit,
    handleOpenWithdraw,
    handleUnarchive,
    hasAnyInvestmentAccounts,
    hasSearch,
    isArchiveLoading,
    isFormOpen,
    isLiquidityLoading,
    isReadOnlyMode,
    netWorthError,
    netWorthLoading,
    netWorthPoints,
    overviewError,
    overviewLoading,
    retryCurrentAccountsView,
    searchInput,
    setSearchInput,
    setView,
    showBlockingAccountsError,
    showInlineAccountsError,
    summaryMetrics,
    view,
  } = useInvestmentsPage();

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8">
        <PageHeader title="Инвестиции" className="mb-0" />

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <InvestmentsSummary
              loading={overviewLoading}
              error={overviewError}
              metrics={summaryMetrics}
              onRetry={() => void retryCurrentAccountsView()}
            />
          </div>

          {activeCount > 0 ? (
            <>
              <div className="lg:col-span-6 h-full">
                <InvestmentsAllocationCard
                  slices={allocationSlices}
                  baseCurrencyCode={baseCurrencyCode}
                  loading={overviewLoading}
                  error={overviewError}
                  onRetry={() => void retryCurrentAccountsView()}
                />
              </div>

              <div className="lg:col-span-6 h-full">
                <InvestmentsTrendCard
                  points={netWorthPoints}
                  currencyCode={baseCurrencyCode}
                  loading={netWorthLoading}
                  error={netWorthError}
                  onRetry={() => void retryCurrentAccountsView()}
                />
              </div>
            </>
          ) : null}

          <div className="lg:col-span-12">
            <InvestmentsAccountsSection
              activeCount={activeCount}
              archivedCount={archivedCount}
              accounts={filteredAccounts}
              view={view}
              searchInput={searchInput}
              hasAnyInvestmentAccounts={hasAnyInvestmentAccounts}
              hasSearch={hasSearch}
              loading={accountsLoading}
              error={accountsErrorMessage}
              showInlineError={showInlineAccountsError}
              showBlockingError={showBlockingAccountsError}
              baseCurrencyCode={baseCurrencyCode}
              canCreateAccount={canCreateAccount}
              isReadOnlyMode={isReadOnlyMode}
              onCreateAccount={handleOpenCreateAccount}
              onSearchChange={setSearchInput}
              onViewChange={setView}
              onRetry={() => void retryCurrentAccountsView()}
              onEditAccount={handleEditAccount}
              onDeposit={handleOpenDeposit}
              onWithdraw={handleOpenWithdraw}
              onAdjustBalance={handleOpenAdjustments}
              onLiquidityChange={handleLiquidityChange}
              onArchive={handleArchiveRequest}
              onUnarchive={handleUnarchive}
              isLiquidityLoading={isLiquidityLoading}
              isArchiveLoading={isArchiveLoading}
            />
          </div>
        </div>

        <AccountFormModal
          open={isFormOpen}
          account={editingAccount}
          currencies={currencies}
          allowedTypes={allowedAccountTypes}
          onClose={closeForm}
          onSuccess={handleFormSuccess}
        />

        <AccountBalanceAdjustmentsModal
          open={adjustmentsAccount !== null}
          account={adjustmentsAccount}
          readonly={isReadOnlyMode}
          onClose={closeAdjustments}
          onSuccess={handleAdjustmentSuccess}
        />

        {cashFlowModal.type !== 'closed' ? (
          <InvestmentCashFlowModal
            open
            accountId={cashFlowModal.account.id}
            type={cashFlowModal.type}
            onClose={closeCashFlowModal}
            onSuccess={handleCashFlowSuccess}
          />
        ) : null}

        <ConfirmDialog
          open={archiveTarget !== null}
          onOpenChange={(open) => !open && closeArchiveDialog()}
          title={
            archiveTarget
              ? `Архивировать счёт «${archiveTarget.name}»?`
              : 'Архивировать счёт'
          }
          description="Счёт будет исключён из активных метрик, но вся история операций сохранится."
          confirmLabel="Архивировать"
          variant="destructive"
          isLoading={archiveTarget ? isArchiveLoading(archiveTarget.id) : false}
          onConfirm={handleArchiveConfirm}
        />
      </div>
    </ErrorBoundary>
  );
}
