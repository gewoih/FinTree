import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/format';
import type {
  AccountDto,
  PagedResult,
  TransactionCategoryDto,
  TransactionDto,
} from '@/types';
import type { TransactionDisplayRow } from './transactionModels';
import type { TransactionFiltersValue } from './transactionModels';
import {
  buildTransactionRows,
  groupRowsByDate,
  hasActiveTransactionFilters,
} from './transactionUtils';
import { TransactionRow } from './TransactionRow';
import { TransactionListPagination } from './TransactionListPagination';

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
  onToggleMandatory?: (transaction: TransactionDto, isMandatory: boolean) => void;
  onRetry: () => void;
  onClear: () => void;
}

function getSignedAmountLabel(amount: number, currencyCode: string): string {
  if (amount === 0) {
    return formatCurrency(0, currencyCode);
  }

  return `${amount > 0 ? '+' : '−'}${formatCurrency(Math.abs(amount), currencyCode)}`;
}

function getGroupNetAmount(items: TransactionDisplayRow[]): number {
  return items.reduce((sum, row) => {
    const baseAmount = row.transaction.amountInBaseCurrency ?? row.amount;
    return sum + (row.tone === 'Income' ? baseAmount : -baseAmount);
  }, 0);
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
        description="Добавьте первую транзакцию, чтобы заполнить историю."
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
              <header
                className="sticky top-0 flex items-center justify-between border-b border-border/70 bg-card/95 px-4 py-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase backdrop-blur-sm"
                style={{ zIndex: 'var(--ft-z-above)' }}
              >
                <span className="capitalize">{group.label}</span>
                <span className="tabular-nums normal-case">
                  {getSignedAmountLabel(groupNetAmount, baseCurrencyCode)}
                </span>
              </header>

              <div className="divide-y divide-border/70">
                {group.items.map((row) => (
                  <TransactionRow
                    key={row.id}
                    row={row}
                    baseCurrencyCode={baseCurrencyCode}
                    readonly={readonly}
                    togglingMandatoryId={togglingMandatoryId}
                    onEdit={onEdit}
                    onToggleMandatory={onToggleMandatory}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <TransactionListPagination
        total={data.total}
        page={filters.page}
        pageSize={filters.pageSize}
        onPageChange={(page) => onFiltersChange({ page })}
      />
    </>
  );
}
