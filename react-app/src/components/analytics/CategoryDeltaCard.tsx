import { ArrowDown, ArrowUp } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import type { CategoryDeltaItemDto } from '@/types';

import {
  AnalyticsInset,
  AnalyticsPanel,
  AnalyticsSectionHeader,
  AnalyticsState,
} from './analyticsTheme';
import { getAnalyticsCategoryColor } from './chartPalette';
import { formatAnalyticsMetaMoney, formatAnalyticsPercent } from './models';

interface CategoryDeltaCardProps {
  loading: boolean;
  error: string | null;
  periodLabel: string;
  increased: CategoryDeltaItemDto[];
  decreased: CategoryDeltaItemDto[];
  currency: string;
  onRetry: () => void;
}

const SKELETON_KEYS = ['alpha', 'beta', 'gamma', 'delta'] as const;

function DeltaSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Загрузка изменений по категориям"
      className="space-y-5 px-6 pb-6"
    >
      <div className="space-y-3">
        <Skeleton className="h-5 w-20" />
        {SKELETON_KEYS.slice(0, 2).map((key) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-1 w-full rounded-md" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        {SKELETON_KEYS.slice(2).map((key) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-1 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function getMaxDelta(items: CategoryDeltaItemDto[]): number {
  if (items.length === 0) {
    return 1;
  }

  return Math.max(...items.map((item) => Math.abs(item.deltaAmount)), 1);
}

function barWidth(item: CategoryDeltaItemDto, maxDelta: number): string {
  const ratio = maxDelta <= 0 ? 0 : Math.abs(item.deltaAmount) / maxDelta;
  const pct = Math.min(100, ratio * 100);
  // Use max() so even a near-zero delta renders as a visible 2px sliver
  return `max(2px, ${pct}%)`;
}

function formatDelta(item: CategoryDeltaItemDto, direction: 'up' | 'down', currency: string): string {
  const sign = direction === 'up' ? '+' : '−';
  return `${sign}${formatAnalyticsMetaMoney(Math.abs(item.deltaAmount), currency)}`;
}

function toneColor(direction: 'up' | 'down'): string {
  return direction === 'up' ? 'var(--ft-danger-400)' : 'var(--ft-success-400)';
}

function toneFill(direction: 'up' | 'down'): string {
  return direction === 'up'
    ? 'color-mix(in srgb, var(--ft-danger-500) 86%, var(--ft-danger-300))'
    : 'color-mix(in srgb, var(--ft-success-500) 86%, var(--ft-success-300))';
}

interface DeltaRowProps {
  item: CategoryDeltaItemDto;
  currency: string;
  direction: 'up' | 'down';
  maxDelta: number;
}

function DeltaRow({ item, currency, direction, maxDelta }: DeltaRowProps) {
  const percentLabel = formatAnalyticsPercent(
    item.deltaPercent === null ? null : Math.abs(item.deltaPercent),
  );

  return (
    <div className="space-y-0.5">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(6.5rem,7.5rem)] items-start gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-block size-3 shrink-0 rounded-full"
            style={{ backgroundColor: getAnalyticsCategoryColor(item.id) }}
            aria-hidden="true"
          />
          <span className="truncate text-base font-semibold text-foreground">
            {item.name}
          </span>
        </div>

        <div className="flex items-baseline justify-end gap-2" style={{ color: toneColor(direction) }}>
          <p className="text-base font-semibold tabular-nums">
            {formatDelta(item, direction, currency)}
          </p>
          {percentLabel !== '—' && (
            <p className="text-sm font-medium tabular-nums opacity-75">{percentLabel}</p>
          )}
        </div>
      </div>

      <div
        className="h-1 overflow-hidden rounded-md"
        style={{ backgroundColor: 'color-mix(in srgb, var(--ft-primary-500) 10%, transparent)' }}
      >
        <div
          className="h-full rounded-md"
          style={{
            width: barWidth(item, maxDelta),
            backgroundColor: toneFill(direction),
          }}
        />
      </div>
    </div>
  );
}

interface DeltaSectionProps {
  title: string;
  items: CategoryDeltaItemDto[];
  currency: string;
  direction: 'up' | 'down';
}

function DeltaSection({ title, items, currency, direction }: DeltaSectionProps) {
  if (items.length === 0) {
    return null;
  }

  const maxDelta = getMaxDelta(items);
  const Icon = direction === 'up' ? ArrowUp : ArrowDown;

  return (
    <section className="space-y-3">
      <div
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground"
      >
        <Icon
          className="size-4 shrink-0"
          style={{ color: direction === 'up' ? 'var(--ft-danger-300)' : 'var(--ft-success-300)' }}
          aria-hidden="true"
        />
        <span>{title}</span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <DeltaRow
            key={item.id}
            item={item}
            currency={currency}
            direction={direction}
            maxDelta={maxDelta}
          />
        ))}
      </div>
    </section>
  );
}

export function CategoryDeltaCard({
  loading,
  error,
  periodLabel,
  increased,
  decreased,
  currency,
  onRetry,
}: CategoryDeltaCardProps) {
  const isEmpty = increased.length === 0 && decreased.length === 0;

  return (
    <AnalyticsPanel ariaLabel={`Изменения по категориям за ${periodLabel}`}>
      <AnalyticsSectionHeader
        title="Изменения по категориям"
        tooltip="Какие категории выросли или снизились по сравнению с предыдущим месяцем."
        ariaLabel="Подробнее об изменениях по категориям"
      />

      {loading ? (
        <DeltaSkeleton />
      ) : error ? (
        <AnalyticsState
          title="Не удалось загрузить сравнение"
          description={error}
          onRetry={onRetry}
          className="min-h-[320px]"
        />
      ) : isEmpty ? (
        <div className="px-6 pb-6">
          <AnalyticsInset className="flex min-h-[320px] items-center justify-center px-8 text-center">
            <p className="max-w-md text-base leading-7 text-[var(--ft-text-secondary)]">
              Нет данных для сравнения. Нужен предыдущий период расходов, чтобы показать заметные изменения по категориям.
            </p>
          </AnalyticsInset>
        </div>
      ) : (
        <div className="space-y-5 px-5 pb-5">
          <DeltaSection title="Рост" items={increased} currency={currency} direction="up" />
          <DeltaSection title="Снижение" items={decreased} currency={currency} direction="down" />
        </div>
      )}
    </AnalyticsPanel>
  );
}
