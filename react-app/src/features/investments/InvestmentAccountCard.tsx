import { createElement } from 'react';
import { Activity } from 'lucide-react';
import { getAccountTypeIcon, getAccountTypeLabel } from '@/features/accounts/accountUtils';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/format';
import type { InvestmentAccountViewModel } from './investmentModels';
import { formatInvestmentReturn } from './investmentUtils';
import { InvestmentActionsMenu } from './InvestmentActionsMenu';

interface InvestmentAccountCardProps {
  account: InvestmentAccountViewModel;
  baseCurrencyCode: string;
  readonly?: boolean;
  interactionLocked?: boolean;
  isLiquidityLoading?: boolean;
  isArchiveLoading?: boolean;
  onEdit: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
  onAdjustBalance: () => void;
  onLiquidityChange: (nextValue: boolean) => void;
  onArchive: () => void;
  onUnarchive: () => void;
}

export function InvestmentAccountCard({
  account,
  baseCurrencyCode,
  readonly = false,
  interactionLocked = false,
  isLiquidityLoading = false,
  isArchiveLoading = false,
  onEdit,
  onDeposit,
  onWithdraw,
  onAdjustBalance,
  onLiquidityChange,
  onArchive,
  onUnarchive,
}: InvestmentAccountCardProps) {
  const showSecondaryBalance = account.currencyCode !== baseCurrencyCode;
  let returnTone = 'text-muted-foreground';
  if (account.returnPercent != null) {
    if (account.returnPercent > 0) {
      returnTone = 'text-[var(--ft-success-400)]';
    } else if (account.returnPercent < 0) {
      returnTone = 'text-[var(--ft-danger-400)]';
    }
  }

  return (
    <article
      className={cn(
        'flex min-h-[168px] flex-col gap-3 rounded-2xl border border-border/80 bg-card/95 px-4 py-4 shadow-[var(--ft-shadow-sm)] transition-[border-color,box-shadow,transform] duration-200',
        !readonly && 'hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[var(--ft-shadow-md)]'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--ft-primary-500) 14%, transparent)',
            color: 'var(--ft-primary-300)',
          }}
          aria-hidden="true"
        >
          {createElement(getAccountTypeIcon(account.type), { className: 'size-[18px]' })}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[1.125rem] font-semibold leading-snug text-foreground">
              {account.name}
            </h3>
            {readonly || account.isArchived ? (
              <span className="rounded-full border border-border/80 bg-muted/30 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                В архиве
              </span>
            ) : null}
          </div>

          <p className="mt-0.5 text-sm text-muted-foreground">{getAccountTypeLabel(account.type)}</p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex min-h-[24px] items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                account.isLiquid
                  ? 'bg-[color-mix(in_srgb,var(--ft-success-500)_16%,transparent)] text-[var(--ft-success-400)]'
                  : 'bg-muted/40 text-muted-foreground'
              )}
            >
              {account.isLiquid ? 'Ликвидный' : 'Неликвидный'}
            </span>
            {account.isMain ? (
              <span className="inline-flex min-h-[24px] items-center rounded-full bg-[color-mix(in_srgb,var(--ft-info-500)_16%,transparent)] px-2.5 py-0.5 text-xs font-medium text-[var(--ft-info-400)]">
                Основной
              </span>
            ) : null}
          </div>
        </div>

        <InvestmentActionsMenu
          accountName={account.name}
          readonly={readonly}
          interactionLocked={interactionLocked}
          isLiquid={account.isLiquid}
          isArchived={account.isArchived}
          isLiquidityLoading={isLiquidityLoading}
          isArchiveLoading={isArchiveLoading}
          onDeposit={onDeposit}
          onWithdraw={onWithdraw}
          onAdjustBalance={onAdjustBalance}
          onRename={onEdit}
          onToggleLiquidity={() => onLiquidityChange(!account.isLiquid)}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
        />
      </div>

      <div className="space-y-1">
        <p className="text-[1.8rem] font-semibold leading-none tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
          {formatCurrency(account.balanceInBaseCurrency, baseCurrencyCode)}
        </p>
        {showSecondaryBalance ? (
          <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
            {formatCurrency(account.balance, account.currencyCode)}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-4 border-t border-border/70 pt-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">Доходность</div>
          <div className={cn('mt-1 text-base font-semibold [font-variant-numeric:tabular-nums]', returnTone)}>
            {formatInvestmentReturn(account.returnPercent)}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Activity className="size-3.5" aria-hidden="true" />
          <span>{account.currencyCode}</span>
        </div>
      </div>
    </article>
  );
}
