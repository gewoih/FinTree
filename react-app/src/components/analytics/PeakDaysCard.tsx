import { useState } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/format';
import type { PeakDayDto, PeakDaysSummaryDto } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PeakDaysCardProps {
  loading: boolean;
  error: string | null;
  peaks: PeakDayDto[];
  summary: PeakDaysSummaryDto;
  currency: string;
  onRetry: () => void;
  onPeakSelect: (peak: PeakDayDto) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

function formatPeakDate(year: number, month: number, day: number): string {
  return DATE_FMT.format(new Date(year, month - 1, day));
}

function sharePercentStyle(share: number | null): React.CSSProperties {
  if (share === null) return {};
  if (share <= 10) return { color: 'var(--ft-success-500)' };
  if (share <= 25) return { color: 'var(--ft-warning-500)' };
  return { color: 'var(--ft-danger-500)' };
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function HeaderTooltip() {
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label="Подробнее о пиковых днях"
            className={cn(
              'inline-flex items-center justify-center rounded-full',
              'min-h-[44px] min-w-[44px]',
              'text-muted-foreground transition-colors',
              'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            onClick={() => setOpen((prev) => !prev)}
          >
            <HelpCircle className="size-3.5" aria-hidden="true" />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            sideOffset={6}
            className={cn(
              'z-50 max-w-[280px] rounded-lg border border-border bg-popover px-3 py-2',
              'text-sm text-popover-foreground shadow-md',
              'animate-in fade-in-0 zoom-in-95',
            )}
          >
            Дни, когда расходы значительно превысили среднедневной уровень. Помогает выявить крупные разовые траты.
            <TooltipPrimitive.Arrow className="fill-border" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PeakDaysSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Загрузка пиковых дней" className="flex flex-col gap-3">
      <Skeleton className="h-[60px] w-full rounded-lg" />
      <Skeleton className="h-[44px] w-full rounded-lg" />
      <Skeleton className="h-[44px] w-full rounded-lg" />
    </div>
  );
}

// ─── Summary block ────────────────────────────────────────────────────────────

interface SummaryBlockProps {
  summary: PeakDaysSummaryDto;
  currency: string;
}

function SummaryBlock({ summary, currency }: SummaryBlockProps) {
  const sharePercent = summary.sharePercent;
  const totalFormatted = formatCurrency(summary.total, currency);
  const monthTotalFormatted = summary.monthTotal !== null
    ? formatCurrency(summary.monthTotal, currency)
    : '—';

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div
        className="text-4xl font-bold leading-none"
        style={{ fontVariantNumeric: 'tabular-nums', ...sharePercentStyle(sharePercent) }}
      >
        {sharePercent !== null ? `${sharePercent}%` : '—'}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">расходов в пиковые дни</div>
      <div className="mt-2 text-xs text-muted-foreground">
        {summary.count} {pluralizeDays(summary.count)} · {totalFormatted} из {monthTotalFormatted}
      </div>
    </div>
  );
}

function pluralizeDays(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 14) return 'дней';
  if (n % 10 === 1) return 'день';
  if (n % 10 >= 2 && n % 10 <= 4) return 'дня';
  return 'дней';
}

// ─── Peak item ────────────────────────────────────────────────────────────────

interface PeakItemProps {
  peak: PeakDayDto;
  currency: string;
  onSelect: (peak: PeakDayDto) => void;
}

function PeakItem({ peak, currency, onSelect }: PeakItemProps) {
  const dateLabel = formatPeakDate(peak.year, peak.month, peak.day);
  const amountFormatted = formatCurrency(peak.amount, currency);

  return (
    <button
      type="button"
      onClick={() => onSelect(peak)}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border border-border bg-card px-4',
        'min-h-[44px] py-3 text-left transition-colors',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span className="text-sm font-medium text-foreground capitalize">{dateLabel}</span>
      <div className="flex flex-col items-end gap-0.5">
        <span
          className="text-sm font-semibold text-foreground"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {amountFormatted}
        </span>
        {peak.sharePercent !== null && (
          <span className="text-xs text-muted-foreground">
            {peak.sharePercent}% от месяца
          </span>
        )}
      </div>
    </button>
  );
}

// ─── PeakDaysCard ─────────────────────────────────────────────────────────────

const DEFAULT_VISIBLE = 3;

export function PeakDaysCard({
  loading,
  error,
  peaks,
  summary,
  currency,
  onRetry,
  onPeakSelect,
}: PeakDaysCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-1">
          <span className="text-sm font-semibold text-foreground">Пиковые дни</span>
        </div>
        <PeakDaysSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-1">
          <span className="text-sm font-semibold text-foreground">Пиковые дни</span>
        </div>
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
      </div>
    );
  }

  const visiblePeaks = expanded ? peaks : peaks.slice(0, DEFAULT_VISIBLE);
  const hasMore = peaks.length > DEFAULT_VISIBLE;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-1">
        <span className="text-sm font-semibold text-foreground">Пиковые дни</span>
        <HeaderTooltip />
      </div>

      {peaks.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Пиковых дней нет — расходы стабильны
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <SummaryBlock summary={summary} currency={currency} />

          <div className="flex flex-col gap-2">
            {visiblePeaks.map((peak) => (
              <PeakItem
                key={`${peak.year}-${peak.month}-${peak.day}`}
                peak={peak}
                currency={currency}
                onSelect={onPeakSelect}
              />
            ))}
          </div>

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] w-full text-muted-foreground"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? 'Свернуть' : `Показать все (${peaks.length})`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

