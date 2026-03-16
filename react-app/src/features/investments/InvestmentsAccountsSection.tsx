import { BriefcaseBusiness, Inbox, SearchX } from 'lucide-react';
import { AccountsToolbar } from '@/features/accounts/AccountsToolbar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import type { InvestmentAccountViewModel, InvestmentsView } from './investmentModels';
import { InvestmentAccountCard } from './InvestmentAccountCard';

interface InvestmentsAccountsSectionProps {
  activeCount: number;
  archivedCount: number;
  accounts: InvestmentAccountViewModel[];
  view: InvestmentsView;
  searchInput: string;
  hasAnyInvestmentAccounts: boolean;
  hasSearch: boolean;
  loading: boolean;
  error: string | null;
  showInlineError: boolean;
  showBlockingError: boolean;
  baseCurrencyCode: string;
  canCreateAccount: boolean;
  isReadOnlyMode: boolean;
  onCreateAccount: () => void;
  onSearchChange: (value: string) => void;
  onViewChange: (view: InvestmentsView) => void;
  onRetry: () => void;
  onEditAccount: (account: InvestmentAccountViewModel) => void;
  onDeposit: (account: InvestmentAccountViewModel) => void;
  onWithdraw: (account: InvestmentAccountViewModel) => void;
  onAdjustBalance: (account: InvestmentAccountViewModel) => void;
  onLiquidityChange: (account: InvestmentAccountViewModel, nextValue: boolean) => void;
  onArchive: (account: InvestmentAccountViewModel) => void;
  onUnarchive: (account: InvestmentAccountViewModel) => void;
  isLiquidityLoading: (accountId: string) => boolean;
  isArchiveLoading: (accountId: string) => boolean;
}

export function InvestmentsAccountsSection({
  activeCount,
  archivedCount,
  accounts,
  view,
  searchInput,
  hasAnyInvestmentAccounts,
  hasSearch,
  loading,
  error,
  showInlineError,
  showBlockingError,
  baseCurrencyCode,
  canCreateAccount,
  isReadOnlyMode,
  onCreateAccount,
  onSearchChange,
  onViewChange,
  onRetry,
  onEditAccount,
  onDeposit,
  onWithdraw,
  onAdjustBalance,
  onLiquidityChange,
  onArchive,
  onUnarchive,
  isLiquidityLoading,
  isArchiveLoading,
}: InvestmentsAccountsSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[var(--ft-shadow-sm)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Счета</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Управляйте инвестиционными счетами и следите за их статусом.
          </p>
        </div>

        <Button
          className="min-h-[44px] rounded-xl px-5"
          onClick={onCreateAccount}
          disabled={!canCreateAccount}
        >
          Добавить счёт
        </Button>
      </div>

      <AccountsToolbar
        view={view}
        activeCount={activeCount}
        archivedCount={archivedCount}
        searchValue={searchInput}
        onSearchChange={onSearchChange}
        onViewChange={onViewChange}
      />

      {showInlineError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <div className="font-medium text-foreground">Не удалось обновить список счетов</div>
          <div className="mt-1 text-muted-foreground">{error}</div>
          <Button className="mt-3 min-h-[44px]" variant="outline" onClick={onRetry}>
            Повторить
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={`investment-card-${index + 1}`} className="h-[168px] rounded-2xl" />
          ))}
        </div>
      ) : showBlockingError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <div className="font-medium text-foreground">Не удалось загрузить инвестиционные счета</div>
          <div className="mt-1 text-muted-foreground">{error}</div>
          <Button className="mt-3 min-h-[44px]" variant="outline" onClick={onRetry}>
            Повторить
          </Button>
        </div>
      ) : !hasAnyInvestmentAccounts ? (
        <EmptyState
          icon={<BriefcaseBusiness />}
          title="Нет инвестиционных счетов"
          description="Добавьте брокерский счёт, депозит или криптовалютный аккаунт, чтобы начать отслеживать капитал и доходность."
          action={
            isReadOnlyMode || !canCreateAccount
              ? undefined
              : {
                  label: 'Добавить счёт',
                  onClick: onCreateAccount,
                }
          }
        />
      ) : view === 'active' && activeCount === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="Нет активных инвестиционных счетов"
          description="Все инвестиционные счета находятся в архиве. Откройте архив и верните нужные счета в активную часть портфеля."
          action={{ label: 'Открыть архив', onClick: () => onViewChange('archived') }}
        />
      ) : view === 'archived' && archivedCount === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="Архив инвестиций пуст"
          description="Здесь появятся инвестиционные счета после архивации."
          action={{ label: 'К активным счетам', onClick: () => onViewChange('active') }}
        />
      ) : accounts.length === 0 && hasSearch ? (
        <EmptyState
          icon={<SearchX />}
          title="Ничего не найдено"
          description="По текущему запросу нет подходящих инвестиционных счетов."
          action={{ label: 'Сбросить поиск', onClick: () => onSearchChange('') }}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {accounts.map((account) => (
            <InvestmentAccountCard
              key={account.id}
              account={account}
              baseCurrencyCode={baseCurrencyCode}
              readonly={view === 'archived'}
              interactionLocked={isReadOnlyMode}
              isLiquidityLoading={isLiquidityLoading(account.id)}
              isArchiveLoading={isArchiveLoading(account.id)}
              onEdit={() => onEditAccount(account)}
              onDeposit={() => onDeposit(account)}
              onWithdraw={() => onWithdraw(account)}
              onAdjustBalance={() => onAdjustBalance(account)}
              onLiquidityChange={(nextValue) => onLiquidityChange(account, nextValue)}
              onArchive={() => onArchive(account)}
              onUnarchive={() => onUnarchive(account)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
