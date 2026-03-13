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
import { AnalyticsPanel } from './analyticsTheme';
import { analyticsMetricStyle } from './analyticsTokens';
import type { MetricAccent, SummaryMetric } from './models';

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
    <div className="flex min-h-[126px] items-center gap-3 px-5 py-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <InfoTooltip
        content={metric.tooltip}
        ariaLabel={`Подробнее: ${metric.label}`}
      >
        <button
          type="button"
          aria-label={`Подробнее: ${metric.label}`}
          className="flex size-12 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={iconStyle}
        >
          {createElement(resolveIcon(metric.icon), { className: 'size-5' })}
        </button>
      </InfoTooltip>

      <div className="flex min-w-0 flex-col justify-center gap-1">
        <span
          className="min-w-0 text-foreground"
          style={{ ...analyticsMetricStyle, color: valueColor }}
        >
          {metric.value}
        </span>

        <span className="text-sm leading-5 text-[var(--ft-text-secondary)]">
          {metric.secondary ?? '\u00A0'}
        </span>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const SKELETON_KEYS = ['alpha', 'beta', 'gamma'] as const;

function StripSkeleton() {
  return (
    <AnalyticsPanel role="status" aria-busy="true" ariaLabel="Загрузка метрик">
      <div className="grid grid-cols-1 divide-y divide-[var(--ft-border-subtle)] md:grid-cols-3 md:divide-x md:divide-y-0">
        {SKELETON_KEYS.map((key) => (
          <div key={key} className="flex min-h-[126px] items-center gap-3 px-5 py-4">
            <Skeleton className="size-12 rounded-lg" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-5 w-36" />
            </div>
          </div>
        ))}
      </div>
    </AnalyticsPanel>
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
        className="flex min-h-[170px] flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center"
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
    <AnalyticsPanel>
      <div className="grid grid-cols-1 divide-y divide-[var(--ft-border-subtle)] md:grid-cols-3 md:divide-x md:divide-y-0">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </div>
    </AnalyticsPanel>
  );
}
