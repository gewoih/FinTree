import { ArrowRightLeft, Trash2 } from 'lucide-react';
import { Fragment, useState } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useViewport } from '@/hooks/useViewport';
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
import { getCategoryIcon } from '@/features/categories/categoryIcons';

interface TransactionListProps {
  data: PagedResult<TransactionDto> | undefined;
  accounts: AccountDto[];
  categories: TransactionCategoryDto[];
  loading: boolean;
  error: string | null;
  filters: TransactionFiltersValue;
  readonly?: boolean;
  deletingId?: string | null;
  onFiltersChange: (f: Partial<TransactionFiltersValue>) => void;
  onEdit: (transaction: TransactionDto) => void;
  onEditTransfer: (transferId: string, occurredAt: string) => void;
  onDeleteTransaction: (transaction: TransactionDto) => void;
  onDeleteTransfer: (transferId: string) => void;
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
  filters,
  readonly = false,
  deletingId,
  onFiltersChange,
  onEdit,
  onEditTransfer,
  onDeleteTransaction,
  onDeleteTransfer,
  onRetry,
  onClear,
}: TransactionListProps) {
  const { isMobile } = useViewport();
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'transaction'; transaction: TransactionDto }
    | { type: 'transfer'; transferId: string }
    | null
  >(null);

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
      />
    ) : (
      <EmptyState
        title="Транзакций пока нет"
        description="Добавьте первую транзакцию или перевод, чтобы заполнить историю."
      />
    );
  }

  const rows = buildTransactionRows(data.items, accounts, categories);
  const groups = groupRowsByDate(rows);
  const pageCount = Math.max(1, Math.ceil(data.total / filters.pageSize));
  const rangeStart = (filters.page - 1) * filters.pageSize + 1;
  const rangeEnd = Math.min(filters.page * filters.pageSize, data.total);
  // Mobile columns: Description + Amount + (Actions when not readonly)
  // Desktop columns: Description + Account + Date + Amount + (Actions when not readonly)
  const groupColSpan = isMobile
    ? readonly ? 2 : 3
    : readonly ? 4 : 5;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card/80 shadow-[var(--ft-shadow-sm)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Описание</TableHead>
              {!isMobile ? <TableHead>Счёт</TableHead> : null}
              {!isMobile ? <TableHead>Дата</TableHead> : null}
              <TableHead className="text-right">Сумма</TableHead>
              {!readonly ? <TableHead className="w-16" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <Fragment key={group.dateKey}>
                <TableRow className="bg-muted/35 hover:bg-muted/35">
                  <TableCell
                    colSpan={groupColSpan}
                    className="px-4 py-3 text-sm font-semibold capitalize text-foreground"
                  >
                    {group.label}
                  </TableCell>
                </TableRow>

                {group.items.map((row) => {
                  const CategoryIcon =
                    row.kind === 'transaction'
                      ? getCategoryIcon(row.categoryIcon)
                      : ArrowRightLeft;

                  return (
                    <TableRow
                      key={row.id}
                      className={cn(!readonly && 'group cursor-pointer')}
                      onClick={() => {
                        if (readonly) {
                          return;
                        }

                        if (row.kind === 'transaction') {
                          onEdit(row.transaction);
                          return;
                        }

                        onEditTransfer(row.transferId, row.occurredAt);
                      }}
                    >
                      <TableCell>
                        <div className="space-y-2">
                          <div className="font-medium text-foreground">{row.title}</div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            {row.kind === 'transaction' ? (
                              <Badge
                                variant="outline"
                                className="gap-1 rounded-full border-border/80"
                              >
                                <span
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: row.categoryColor }}
                                />
                                <CategoryIcon className="size-3.5" />
                                {row.categoryName}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 rounded-full">
                                <ArrowRightLeft className="size-3.5" />
                                Перевод
                              </Badge>
                            )}
                            {isMobile ? (
                              <span>{formatDateTime(row.occurredAt)}</span>
                            ) : null}
                            {row.caption ? <span>{row.caption}</span> : null}
                          </div>
                        </div>
                      </TableCell>

                      {!isMobile ? <TableCell>{row.accountName}</TableCell> : null}

                      {!isMobile ? (
                        <TableCell>{formatDateTime(row.occurredAt)}</TableCell>
                      ) : null}

                      <TableCell className="text-right [font-variant-numeric:tabular-nums]">
                        {row.kind === 'transaction' ? (
                          <div
                            className={cn(
                              'font-semibold',
                              row.tone === 'Income'
                                ? 'text-[var(--ft-success-400)]'
                                : 'text-[var(--ft-danger-400)]'
                            )}
                          >
                            {row.tone === 'Income' ? '+' : '-'}
                            {formatCurrency(row.amount, row.currencyCode)}
                          </div>
                        ) : (
                          <div className="space-y-1 text-[var(--ft-text-secondary)]">
                            <div className="font-semibold text-muted-foreground">
                              {formatCurrency(row.primaryAmount, row.primaryCurrencyCode)}
                            </div>
                            {row.secondaryAmount !== null &&
                            row.secondaryCurrencyCode &&
                            (row.secondaryAmount !== row.primaryAmount ||
                              row.secondaryCurrencyCode !== row.primaryCurrencyCode) ? (
                              <div className="text-xs">
                                → {formatCurrency(row.secondaryAmount, row.secondaryCurrencyCode)}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </TableCell>

                      {!readonly ? (
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'min-h-[44px] min-w-[44px] rounded-full transition-opacity',
                                !isMobile && 'opacity-0 group-hover:opacity-100'
                              )}
                              disabled={
                                deletingId === row.id ||
                                (row.kind === 'transfer' && deletingId === row.transferId)
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleteTarget(
                                  row.kind === 'transaction'
                                    ? { type: 'transaction', transaction: row.transaction }
                                    : { type: 'transfer', transferId: row.transferId }
                                );
                              }}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(isOpen) => !isOpen && setDeleteTarget(null)}
        title={
          deleteTarget?.type === 'transfer'
            ? 'Удалить перевод?'
            : 'Удалить транзакцию?'
        }
        description="Это действие нельзя отменить."
        confirmLabel="Удалить"
        isLoading={
          deleteTarget?.type === 'transfer'
            ? deletingId === deleteTarget.transferId
            : deletingId === deleteTarget?.transaction.id
        }
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }

          if (deleteTarget.type === 'transfer') {
            onDeleteTransfer(deleteTarget.transferId);
            return;
          }

          onDeleteTransaction(deleteTarget.transaction);
        }}
      />
    </>
  );
}
