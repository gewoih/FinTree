import { AlertCircle, ArrowDown, ArrowUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CategoryDeltaItemDto } from '@/types';

import { InfoTooltip } from './InfoTooltip';
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
      className="space-y-7 px-7 pb-7"
    >
      <div className="space-y-4">
        <Skeleton className="h-5 w-20" />
        {SKELETON_KEYS.slice(0, 2).map((key) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-7 w-32" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-28" />
        {SKELETON_KEYS.slice(2).map((key) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-7 w-32" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
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
  return `${Math.max(10, Math.min(100, ratio * 100))}%`;
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
    <div className="space-y-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,8.75rem)] items-start gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="inline-block size-3 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="truncate text-base font-semibold text-foreground">
            {item.name}
          </span>
        </div>

        <div className="text-right" style={{ color: toneColor(direction) }}>
          <p className="text-base font-semibold tabular-nums">
            {formatDelta(item, direction, currency)}
          </p>
          {percentLabel !== '—' && (
            <p className="text-sm font-medium tabular-nums opacity-90">{percentLabel}</p>
          )}
        </div>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: 'color-mix(in srgb, var(--ft-primary-500) 10%, transparent)' }}
      >
        <div
          className="h-full rounded-full"
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
    <section className="space-y-4">
      <div
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em]"
        style={{ color: direction === 'up' ? 'var(--ft-danger-300)' : 'var(--ft-success-300)' }}
      >
        <Icon className="size-4" aria-hidden="true" />
        <span>{title}</span>
      </div>

      <div className="space-y-4">
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
    <Card
      className="gap-0 rounded-[28px] border border-[var(--ft-border-default)] shadow-[var(--ft-shadow-lg)]"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-raised) 84%, var(--ft-bg-base)) 0%, var(--ft-surface-base) 100%)',
      }}
      aria-label={`Изменения по категориям за ${periodLabel}`}
    >
      <div className="flex items-start gap-2 px-6 py-6">
        <h2 className="text-[1.75rem] font-semibold leading-tight text-foreground">
          Изменения по категориям
        </h2>
        <InfoTooltip
          content="Какие категории выросли или снизились по сравнению с предыдущим месяцем."
          className="-mt-1"
          ariaLabel="Подробнее об изменениях по категориям"
        />
      </div>

      {loading ? (
        <DeltaSkeleton />
      ) : error ? (
        <div
          className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-7 pb-7 text-center"
          role="alert"
        >
          <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground">Не удалось загрузить сравнение</p>
            <p className="text-sm text-[var(--ft-text-secondary)]">{error}</p>
          </div>
          <Button variant="outline" className="min-h-[44px]" onClick={onRetry}>
            Повторить
          </Button>
        </div>
      ) : isEmpty ? (
        <div className="px-7 pb-7">
          <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-[var(--ft-border-subtle)] bg-[color-mix(in_srgb,var(--ft-surface-base)_75%,transparent)] px-8 text-center">
            <p className="max-w-md text-base leading-7 text-[var(--ft-text-secondary)]">
              Нет данных для сравнения. Нужен предыдущий период расходов, чтобы показать заметные изменения по категориям.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-7 px-6 pb-6">
          <DeltaSection title="Рост" items={increased} currency={currency} direction="up" />
          <DeltaSection title="Снижение" items={decreased} currency={currency} direction="down" />
        </div>
      )}
    </Card>
  );
}
