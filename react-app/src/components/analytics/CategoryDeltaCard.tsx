import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { CategoryDeltaItemDto } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryDeltaCardProps {
  loading: boolean;
  error: string | null;
  periodLabel: string;
  increased: CategoryDeltaItemDto[];
  decreased: CategoryDeltaItemDto[];
  currency: string;
  onRetry: () => void;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const SKELETON_KEYS = ['alpha', 'beta', 'gamma', 'delta'] as const;

function DeltaSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Загрузка изменений по категориям" className="flex flex-col gap-2">
      {SKELETON_KEYS.map((key) => (
        <Skeleton key={key} className="h-[44px] w-full rounded-lg" />
      ))}
    </div>
  );
}

// ─── Delta row ────────────────────────────────────────────────────────────────

interface DeltaRowProps {
  item: CategoryDeltaItemDto;
  variant: 'increased' | 'decreased';
  currency: string;
}

function DeltaRow({ item, variant, currency }: DeltaRowProps) {
  const amountStyle: React.CSSProperties = {
    color: variant === 'increased' ? 'var(--ft-danger-500)' : 'var(--ft-success-500)',
    fontVariantNumeric: 'tabular-nums',
  };

  const amountSign = variant === 'increased' ? '+' : '−';
  const absAmount = Math.abs(item.deltaAmount);
  const amountFormatted = `${amountSign}${formatCurrency(absAmount, currency)}`;
  const percentFormatted = item.deltaPercent !== null
    ? formatPercent(Math.abs(item.deltaPercent))
    : null;

  return (
    <div
      className={cn(
        'flex min-h-[44px] items-center gap-3 rounded-lg border border-border bg-card px-4 py-2',
      )}
    >
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: item.color }}
        aria-hidden="true"
      />

      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {item.name}
      </span>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-semibold" style={amountStyle}>
          {amountFormatted}
        </span>
        {percentFormatted !== null && (
          <span className="text-xs text-muted-foreground">{percentFormatted}</span>
        )}
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface DeltaSectionProps {
  title: string;
  items: CategoryDeltaItemDto[];
  variant: 'increased' | 'decreased';
  currency: string;
}

function DeltaSection({ title, items, variant, currency }: DeltaSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <DeltaRow key={item.id} item={item} variant={variant} currency={currency} />
        ))}
      </div>
    </div>
  );
}

// ─── CategoryDeltaCard ────────────────────────────────────────────────────────

export function CategoryDeltaCard({
  loading,
  error,
  periodLabel,
  increased,
  decreased,
  currency,
  onRetry,
}: CategoryDeltaCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">Изменения по категориям</span>
      </div>
      <div className="mb-4 text-xs text-muted-foreground">{periodLabel}</div>

      {loading ? (
        <DeltaSkeleton />
      ) : error ? (
        <div
          className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center"
          role="alert"
        >
          <AlertCircle className="size-7 text-destructive" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">Не удалось загрузить данные</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" className="min-h-[44px]" onClick={onRetry}>
            Повторить
          </Button>
        </div>
      ) : increased.length === 0 && decreased.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Нет изменений по категориям
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <DeltaSection
            title="Выросли"
            items={increased}
            variant="increased"
            currency={currency}
          />
          <DeltaSection
            title="Снизились"
            items={decreased}
            variant="decreased"
            currency={currency}
          />
        </div>
      )}
    </div>
  );
}
