import { createElement } from 'react';
import {
  TrendingDown,
  Banknote,
  Activity,
  Wallet,
  type LucideIcon,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoTooltip } from './InfoTooltip';
import type { MetricAccent, SummaryMetric } from './models';
import { ANALYTICS_CARD_BG } from './models';

interface SummaryStripProps {
  loading: boolean;
  error: string | null;
  metrics: SummaryMetric[];
  onRetry: () => void;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  TrendingDown,
  Banknote,
  Activity,
  Wallet,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Activity;
}

// ─── Accent helpers ───────────────────────────────────────────────────────────

function accentBgStyle(accent: MetricAccent): React.CSSProperties {
  switch (accent) {
    case 'income':
    case 'good':
      return {
        backgroundColor: 'color-mix(in srgb, var(--ft-success-500) 15%, transparent)',
        color: 'var(--ft-success-500)',
      };
    case 'expense':
    case 'poor':
      return {
        backgroundColor: 'color-mix(in srgb, var(--ft-danger-500) 15%, transparent)',
        color: 'var(--ft-danger-500)',
      };
    case 'warning':
      return {
        backgroundColor: 'color-mix(in srgb, var(--ft-warning-500) 16%, transparent)',
        color: 'var(--ft-warning-400)',
      };
    case 'neutral':
    default:
      return {
        backgroundColor: 'color-mix(in srgb, var(--ft-text-secondary) 10%, transparent)',
        color: 'var(--ft-text-secondary)',
      };
  }
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  metric: SummaryMetric;
}

function MetricCard({ metric }: MetricCardProps) {
  const iconStyle = accentBgStyle(metric.accent);
  const valueColor =
    metric.accent === 'income' || metric.accent === 'good'
      ? 'var(--ft-success-400)'
      : metric.accent === 'expense' || metric.accent === 'poor'
        ? 'var(--ft-danger-400)'
        : metric.accent === 'warning'
          ? 'var(--ft-warning-300)'
          : 'var(--ft-text-primary)';

  return (
    <div className="flex min-h-[156px] flex-col justify-between gap-5 px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full"
            style={iconStyle}
            aria-hidden="true"
          >
            {createElement(resolveIcon(metric.icon), { className: 'size-6' })}
          </div>

          <span className="pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ft-text-secondary)]">
            {metric.label}
          </span>
        </div>

        <InfoTooltip
          content={metric.tooltip}
          className="-mt-2 -mr-2"
          ariaLabel={`Подробнее: ${metric.label}`}
        />
      </div>

      <div
        className="flex min-w-0 flex-1 flex-col justify-end gap-2"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <span
          className="text-[clamp(2.1rem,3vw,2.65rem)] font-bold leading-none"
          style={{ color: valueColor }}
        >
          {metric.value}
        </span>

        {metric.secondary && (
          <span className="text-sm text-[var(--ft-text-secondary)]">
            {metric.secondary}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const SKELETON_KEYS = ['alpha', 'beta', 'gamma'] as const;

function StripSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-[28px] border border-[var(--ft-border-default)] shadow-[var(--ft-shadow-lg)]"
      style={{
        background: ANALYTICS_CARD_BG,
      }}
      role="status"
      aria-busy="true"
      aria-label="Загрузка метрик"
    >
      <div className="grid grid-cols-1 divide-y divide-[var(--ft-border-subtle)] md:grid-cols-3 md:divide-x md:divide-y-0">
        {SKELETON_KEYS.map((key) => (
          <div key={key} className="flex min-h-[156px] flex-col justify-between gap-5 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="mt-2 h-4 w-28" />
              </div>
              <Skeleton className="size-10 rounded-full" />
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-5 w-36" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SummaryStrip ─────────────────────────────────────────────────────────────

export function SummaryStrip({ loading, error, metrics, onRetry }: SummaryStripProps) {
  if (loading) {
    return <StripSkeleton />;
  }

  if (error) {
    return (
      <div
        className="flex min-h-[170px] flex-col items-center justify-center gap-4 rounded-[28px] border border-destructive/30 bg-destructive/10 p-6 text-center"
        role="alert"
      >
        <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-foreground">Не удалось загрузить метрики</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px]"
          onClick={onRetry}
        >
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-[28px] border border-[var(--ft-border-default)] shadow-[var(--ft-shadow-lg)]"
      style={{
        background: ANALYTICS_CARD_BG,
      }}
    >
      <div className="grid grid-cols-1 divide-y divide-[var(--ft-border-subtle)] md:grid-cols-3 md:divide-x md:divide-y-0">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </div>
    </section>
  );
}
