import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import type { PeakDayDto, PeakDaysSummaryDto } from '@/types';

import {
  AnalyticsInset,
  AnalyticsPanel,
  AnalyticsSectionHeader,
  AnalyticsState,
} from './analyticsTheme';
import { analyticsHeroStyle } from './analyticsTokens';
import {
  formatAnalyticsMetaMoney,
  formatAnalyticsPercent,
} from './models';

interface PeakDaysCardProps {
  loading: boolean;
  error: string | null;
  peaks: PeakDayDto[];
  summary: PeakDaysSummaryDto;
  currency: string;
  onRetry: () => void;
  onPeakSelect: (peak: PeakDayDto) => void;
}

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' });
const DEFAULT_VISIBLE = 3;

function formatPeakDate(year: number, month: number, day: number): string {
  return DATE_FMT.format(new Date(year, month - 1, day));
}

function pluralizeDays(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 14) return 'дней';
  if (n % 10 === 1) return 'день';
  if (n % 10 >= 2 && n % 10 <= 4) return 'дня';
  return 'дней';
}

function resolveShareStyles(share: number | null) {
  if (share === null) {
    return {
      value: 'var(--ft-text-primary)',
      border: 'var(--ft-border-subtle)',
      background: 'color-mix(in srgb, var(--ft-surface-base) 74%, transparent)',
    };
  }

  if (share <= 10) {
    return {
      value: 'var(--ft-success-400)',
      border: 'color-mix(in srgb, var(--ft-success-500) 45%, var(--ft-border-subtle))',
      background: 'color-mix(in srgb, var(--ft-success-500) 10%, transparent)',
    };
  }

  if (share <= 25) {
    return {
      value: 'var(--ft-warning-300)',
      border: 'color-mix(in srgb, var(--ft-warning-500) 45%, var(--ft-border-subtle))',
      background: 'color-mix(in srgb, var(--ft-warning-500) 10%, transparent)',
    };
  }

  return {
    value: 'var(--ft-danger-400)',
    border: 'color-mix(in srgb, var(--ft-danger-500) 45%, var(--ft-border-subtle))',
    background: 'color-mix(in srgb, var(--ft-danger-500) 10%, transparent)',
  };
}

function PeakDaysSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Загрузка пиковых дней"
      className="space-y-4 px-7 pb-7"
    >
      <Skeleton className="h-[148px] rounded-lg" />
      <Skeleton className="h-[68px] rounded-lg" />
      <Skeleton className="h-[68px] rounded-lg" />
      <Skeleton className="h-[68px] rounded-lg" />
    </div>
  );
}

function SummaryBlock({
  summary,
  currency,
}: {
  summary: PeakDaysSummaryDto;
  currency: string;
}) {
  const styles = resolveShareStyles(summary.sharePercent);
  const shareLabel = formatAnalyticsPercent(summary.sharePercent);

  return (
    <div
      className="rounded-lg border px-6 py-6"
      style={{
        borderColor: styles.border,
        backgroundColor: styles.background,
      }}
    >
      <p
        className="text-foreground"
        style={{ ...analyticsHeroStyle, color: styles.value, fontSize: 'var(--ft-text-4xl)' }}
      >
        {shareLabel}
      </p>

      <p className="mt-2 text-base font-medium text-[var(--ft-text-secondary)]">
        расходов в пиковые дни
      </p>

      <p className="mt-3 text-sm text-[var(--ft-text-tertiary)]">
        {summary.count} {pluralizeDays(summary.count)} · {formatAnalyticsMetaMoney(summary.total, currency)} из{' '}
        {formatAnalyticsMetaMoney(summary.monthTotal, currency)}
      </p>
    </div>
  );
}

function PeakItem({
  peak,
  currency,
  onSelect,
}: {
  peak: PeakDayDto;
  currency: string;
  onSelect: (peak: PeakDayDto) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(peak)}
      className={cn(
        'grid min-h-[68px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 text-left transition-colors',
        'hover:bg-[color-mix(in_srgb,var(--ft-primary-400)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span className="text-base font-semibold text-foreground">
        {formatPeakDate(peak.year, peak.month, peak.day)}
      </span>

      <span className="flex flex-col items-end gap-1 text-right">
        <span className="text-base font-semibold tabular-nums text-foreground">
          {formatAnalyticsMetaMoney(peak.amount, currency)}
        </span>
        <span className="text-sm tabular-nums text-[var(--ft-text-secondary)]">
          {formatAnalyticsPercent(peak.sharePercent)}
        </span>
      </span>
    </button>
  );
}

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
  const visiblePeaks = expanded ? peaks : peaks.slice(0, DEFAULT_VISIBLE);
  const hasMore = peaks.length > DEFAULT_VISIBLE;

  return (
    <AnalyticsPanel>
      <AnalyticsSectionHeader
        title="Пиковые дни"
        tooltip="Дни, когда расходы заметно превысили привычный темп месяца."
        ariaLabel="Подробнее о пиковых днях"
        className="pb-4"
      />

      {loading ? (
        <PeakDaysSkeleton />
      ) : error ? (
        <AnalyticsState title="Не удалось загрузить данные" description={error} onRetry={onRetry} className="min-h-[296px]" />
      ) : peaks.length === 0 ? (
        <div className="px-7 pb-7">
          <AnalyticsInset className="flex min-h-[296px] items-center justify-center px-8 text-center">
            <p className="max-w-md text-base leading-7 text-[var(--ft-text-secondary)]">
              Пиковых дней нет. Расходы распределены по месяцу достаточно равномерно.
            </p>
          </AnalyticsInset>
        </div>
      ) : (
        <div className="space-y-4 px-7 pb-7">
          <SummaryBlock summary={summary} currency={currency} />

          <AnalyticsInset className="divide-y divide-[var(--ft-border-subtle)]">
            {visiblePeaks.map((peak) => (
              <PeakItem
                key={`${peak.year}-${peak.month}-${peak.day}`}
                peak={peak}
                currency={currency}
                onSelect={onPeakSelect}
              />
            ))}
          </AnalyticsInset>

          {hasMore && (
            <Button
              variant="ghost"
              className="min-h-[44px] w-full rounded-md text-[var(--ft-text-secondary)]"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? 'Свернуть' : `Показать все (${peaks.length})`}
            </Button>
          )}
        </div>
      )}
    </AnalyticsPanel>
  );
}
