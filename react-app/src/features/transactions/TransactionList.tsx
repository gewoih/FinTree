import { ArrowRightLeft, Lock, LockOpen } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type {
  AccountDto,
  PagedResult,
  TransactionCategoryDto,
  TransactionDto,
} from '@/types';
import type { TransactionFiltersValue } from './transactionModels';
import {
  buildTransactionRows,
  groupRowsByDate,
  hasActiveTransactionFilters,
} from './transactionUtils';
import { renderCategoryIcon } from '@/features/categories/categoryIcons';

interface TransactionListProps {
  data: PagedResult<TransactionDto> | undefined;
  accounts: AccountDto[];
  categories: TransactionCategoryDto[];
  loading: boolean;
  error: string | null;
  baseCurrencyCode: string;
  filters: TransactionFiltersValue;
  readonly?: boolean;
  togglingMandatoryId?: string | null;
  onFiltersChange: (f: Partial<TransactionFiltersValue>) => void;
  onAdd?: () => void;
  onEdit: (transaction: TransactionDto) => void;
  onEditTransfer: (transferId: string, occurredAt: string) => void;
  onToggleMandatory?: (transaction: TransactionDto, isMandatory: boolean) => void;
  onRetry: () => void;
  onClear: () => void;
}

function getVisiblePages(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

export function TransactionList({
  data,
  accounts,
  categories,
  loading,
  error,
  baseCurrencyCode,
  filters,
  readonly = false,
  togglingMandatoryId = null,
  onFiltersChange,
  onAdd,
  onEdit,
  onEditTransfer,
  onToggleMandatory,
  onRetry,
  onClear,
}: TransactionListProps) {
  if (loading) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card/70 p-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
        <div className="font-medium text-foreground">Не удалось загрузить транзакции</div>
        <div className="mt-1 text-muted-foreground">{error}</div>
        <Button className="mt-3 min-h-[44px]" variant="outline" onClick={onRetry}>
          Повторить
        </Button>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return hasActiveTransactionFilters(filters) ? (
      <EmptyState
        title="Ничего не найдено"
        description="Измените фильтры или очистите их, чтобы снова увидеть операции."
        action={{ label: 'Сбросить фильтры', onClick: onClear }}
        className="min-h-[300px] rounded-xl border border-border bg-card/70"
      />
    ) : (
      <EmptyState
        title="Транзакций пока нет"
        description="Добавьте первую транзакцию или перевод, чтобы заполнить историю."
        action={
          readonly || !onAdd
            ? undefined
            : { label: 'Добавить транзакцию', onClick: onAdd }
        }
        className="min-h-[300px] rounded-xl border border-border bg-card/70"
      />
    );
  }

  const rows = buildTransactionRows(data.items, accounts, categories);
  const groups = groupRowsByDate(rows);
  const pageCount = Math.max(1, Math.ceil(data.total / filters.pageSize));
  const rangeStart = (filters.page - 1) * filters.pageSize + 1;
  const rangeEnd = Math.min(filters.page * filters.pageSize, data.total);

  const getSignedAmountLabel = (amount: number, currencyCode: string) => {
    if (amount === 0) {
      return formatCurrency(0, currencyCode);
    }

    return `${amount > 0 ? '+' : '−'}${formatCurrency(Math.abs(amount), currencyCode)}`;
  };

  const getGroupNetAmount = (items: typeof rows) =>
    items.reduce((sum, row) => {
      if (row.kind !== 'transaction') {
        return sum;
      }

      const baseAmount = row.transaction.amountInBaseCurrency ?? row.amount;
      return sum + (row.tone === 'Income' ? baseAmount : -baseAmount);
    }, 0);

  return (
    <>
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4">
        {groups.map((group) => {
          const groupNetAmount = getGroupNetAmount(group.items);

          return (
            <section
              key={group.dateKey}
              className="overflow-hidden rounded-xl border border-border bg-card/80 shadow-[var(--ft-shadow-sm)]"
            >
              <header className="sticky top-0 z-[1] flex items-center justify-between border-b border-border/70 bg-card/95 px-4 py-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase backdrop-blur-sm">
                <span className="capitalize">{group.label}</span>
                <span className="tabular-nums normal-case">
                  {getSignedAmountLabel(groupNetAmount, baseCurrencyCode)}
                </span>
              </header>

              <div className="divide-y divide-border/70">
                {group.items.map((row) => {
                  const isTransaction = row.kind === 'transaction';
                  const isExpense = isTransaction && row.tone === 'Expense';
                  const isMandatory = isExpense && row.transaction.isMandatory;
                  const metaText = isTransaction
                    ? [row.accountName, row.transaction.description?.trim()]
                        .filter(Boolean)
                        .join(' · ')
                    : [row.accountName, row.caption].filter(Boolean).join(' · ');
                  const originalAmountLabel =
                    isTransaction &&
                    row.transaction.originalAmount != null &&
                    row.transaction.originalCurrencyCode &&
                    (row.transaction.originalCurrencyCode !== row.currencyCode ||
                      row.transaction.originalAmount !== row.amount)
                      ? formatCurrency(
                          Math.abs(row.transaction.originalAmount),
                          row.transaction.originalCurrencyCode,
                        )
                      : null;
                  const rowAriaLabel =
                    row.kind === 'transaction'
                      ? `Открыть транзакцию ${row.categoryName}`
                      : `Открыть перевод ${row.accountName}`;

                  const rowBody = (
                    <>
                      <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span
                          className={cn(
                            'flex size-11 shrink-0 items-center justify-center rounded-md border border-border/80',
                            row.kind === 'transfer' && 'bg-primary/10 text-primary',
                          )}
                          style={
                            row.kind === 'transaction'
                              ? {
                                  backgroundColor: `color-mix(in srgb, ${row.categoryColor} 16%, transparent)`,
                                  color: row.categoryColor,
                                }
                              : undefined
                          }
                          aria-hidden="true"
                        >
                          {row.kind === 'transaction' ? (
                            renderCategoryIcon(row.categoryIcon, { className: 'size-4' })
                          ) : (
                            <ArrowRightLeft className="size-4" />
                          )}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-base font-semibold text-foreground">
                              {row.kind === 'transaction' ? row.categoryName : row.title}
                            </span>
                            {isMandatory ? (
                              <Lock
                                className="size-4 shrink-0 text-[var(--ft-warning-400)]"
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>

                          <div className="truncate text-sm text-muted-foreground">
                            {metaText || formatDateTime(row.occurredAt)}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {row.kind === 'transaction' ? (
                          <>
                            <div
                              className={cn(
                                'text-base font-semibold [font-variant-numeric:tabular-nums]',
                                row.tone === 'Income'
                                  ? 'text-[var(--ft-success-400)]'
                                  : 'text-[var(--ft-danger-400)]',
                              )}
                            >
                              {row.tone === 'Income' ? '+' : '−'}
                              {formatCurrency(row.amount, row.currencyCode)}
                            </div>
                            {originalAmountLabel ? (
                              <div className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                                {originalAmountLabel}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-semibold text-[var(--ft-danger-400)] [font-variant-numeric:tabular-nums]">
                              −{formatCurrency(row.primaryAmount, row.primaryCurrencyCode)}
                            </div>
                            <div className="text-sm font-semibold text-[var(--ft-success-400)] [font-variant-numeric:tabular-nums]">
                              +{formatCurrency(
                                row.secondaryAmount ?? 0,
                                row.secondaryCurrencyCode ?? row.primaryCurrencyCode,
                              )}
                            </div>
                            {row.caption ? (
                              <div className="text-xs text-muted-foreground">{row.caption}</div>
                            ) : null}
                          </>
                        )}
                      </div>
                    </>
                  );

                  return (
                    <div key={row.id} className="flex items-center gap-2 px-3 py-2">
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
                          onClick={() => {
                            if (row.kind === 'transaction') {
                              onEdit(row.transaction);
                              return;
                            }

                            onEditTransfer(row.transferId, row.occurredAt);
                          }}
                        >
                          {rowBody}
                        </button>
                      )}

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
                            onToggleMandatory?.(
                              row.transaction,
                              !row.transaction.isMandatory,
                            )
                          }
                        >
                          {row.transaction.isMandatory ? (
                            <Lock className="size-4" />
                          ) : (
                            <LockOpen className="size-4" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Показано {rangeStart}–{rangeEnd} из {data.total}
        </div>

        {pageCount > 1 ? (
          <Pagination className="mx-0 w-auto justify-start sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    onFiltersChange({ page: Math.max(1, filters.page - 1) })
                  }
                  disabled={filters.page === 1}
                />
              </PaginationItem>

              {getVisiblePages(filters.page, pageCount).map((item, index) => (
                <PaginationItem key={`${item}-${index}`}>
                  {item === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      isActive={item === filters.page}
                      onClick={() => onFiltersChange({ page: item })}
                    >
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    onFiltersChange({ page: Math.min(pageCount, filters.page + 1) })
                  }
                  disabled={filters.page === pageCount}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </div>
    </>
  );
}
