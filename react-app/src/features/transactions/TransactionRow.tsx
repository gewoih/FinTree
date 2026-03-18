import { Lock, LockOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { TransactionDto } from '@/types';
import type { TransactionDisplayRow } from './transactionModels';
import { renderCategoryIcon } from '@/features/categories/categoryIcons';
import { UNCATEGORIZED_NAME } from '@/constants/uncategorized';

interface TransactionRowProps {
  row: TransactionDisplayRow;
  baseCurrencyCode: string;
  readonly: boolean;
  togglingMandatoryId: string | null;
  onEdit: (transaction: TransactionDto) => void;
  onToggleMandatory?: (transaction: TransactionDto, isMandatory: boolean) => void;
}

export function TransactionRow({
  row,
  baseCurrencyCode,
  readonly,
  togglingMandatoryId,
  onEdit,
  onToggleMandatory,
}: TransactionRowProps) {
  const isExpense = row.tone === 'Expense';
  const isMandatory = isExpense && row.transaction.isMandatory;
  const metaText = [row.accountName, row.transaction.description?.trim()]
    .filter(Boolean)
    .join(' · ');
  const accountAmountLabel =
    row.currencyCode !== baseCurrencyCode
      ? formatCurrency(Math.abs(row.amount), row.currencyCode)
      : null;
  const rowAriaLabel = `Открыть транзакцию ${row.categoryName ?? UNCATEGORIZED_NAME}`;

  const rowBody = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border/80"
          style={{
            backgroundColor: `color-mix(in srgb, ${row.categoryColor} 16%, transparent)`,
            color: row.categoryColor,
          }}
          aria-hidden="true"
        >
          {renderCategoryIcon(row.categoryIcon, { className: 'size-4' })}
        </span>

        <div className="min-w-0">
          <div className="truncate text-base font-semibold">
            <span className={cn(
              row.categoryName == null
                ? 'italic text-muted-foreground'
                : 'text-foreground',
            )}>
              {row.categoryName ?? UNCATEGORIZED_NAME}
            </span>
          </div>

          <div className="truncate text-sm text-muted-foreground">
            {metaText || formatDateTime(row.occurredAt)}
          </div>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div
          className={cn(
            'text-base font-semibold [font-variant-numeric:tabular-nums]',
            row.tone === 'Income'
              ? 'text-[var(--ft-success-400)]'
              : 'text-[var(--ft-danger-400)]',
          )}
        >
          {row.tone === 'Income' ? '+' : '−'}
          {formatCurrency(
            Math.abs(row.transaction.amountInBaseCurrency ?? row.amount),
            row.transaction.amountInBaseCurrency != null
              ? baseCurrencyCode
              : row.currencyCode,
          )}
        </div>
        {accountAmountLabel ? (
          <div className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
            {accountAmountLabel}
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {!readonly && isExpense ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            'shrink-0 cursor-pointer rounded-xl border border-transparent text-muted-foreground',
            'hover:border-[var(--ft-warning-400)]/25 hover:bg-[color-mix(in_srgb,var(--ft-warning-500)_12%,transparent)] hover:text-[var(--ft-warning-400)]',
            'focus-visible:border-[var(--ft-warning-400)]/35',
            isMandatory && 'text-[var(--ft-warning-400)]',
          )}
          disabled={togglingMandatoryId === row.id || !onToggleMandatory}
          aria-label={
            row.transaction.isMandatory
              ? 'Снять признак обязательного платежа'
              : 'Пометить как обязательный платёж'
          }
          aria-pressed={row.transaction.isMandatory}
          title={
            row.transaction.isMandatory
              ? 'Снять признак обязательного платежа'
              : 'Пометить как обязательный платёж'
          }
          onClick={() =>
            onToggleMandatory?.(row.transaction, !row.transaction.isMandatory)
          }
        >
          {row.transaction.isMandatory ? (
            <Lock className="size-4" />
          ) : (
            <LockOpen className="size-4" />
          )}
        </Button>
      ) : null}

      {readonly ? (
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-2 py-2">
          {rowBody}
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            'flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition-colors',
            'hover:bg-[var(--ft-table-row-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          )}
          aria-label={rowAriaLabel}
          onClick={() => onEdit(row.transaction)}
        >
          {rowBody}
        </button>
      )}
    </div>
  );
}
