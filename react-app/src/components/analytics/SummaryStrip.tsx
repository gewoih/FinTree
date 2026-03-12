import { createElement, useState } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Banknote,
  PiggyBank,
  Activity,
  BarChart2,
  Wallet,
  type LucideIcon,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MetricAccent = 'income' | 'expense' | 'good' | 'poor' | 'neutral';

export interface SummaryMetric {
  key: string;
  label: string;
  value: string;
  icon: string;
  accent: MetricAccent;
  tooltip: string;
  secondary?: string;
}

interface SummaryStripProps {
  loading: boolean;
  error: string | null;
  metrics: SummaryMetric[];
  onRetry: () => void;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  TrendingDown,
  Shield,
  Banknote,
  PiggyBank,
  Activity,
  BarChart2,
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
    case 'neutral':
    default:
      return {
        backgroundColor: 'color-mix(in srgb, currentColor 8%, transparent)',
        color: 'var(--ft-text-secondary, hsl(var(--muted-foreground)))',
      };
  }
}

// ─── MetricTooltip ────────────────────────────────────────────────────────────

interface MetricTooltipProps {
  content: string;
}

function MetricTooltip({ content }: MetricTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label="Подробнее"
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
              'z-50 max-w-[260px] rounded-lg border border-border bg-popover px-3 py-2',
              'text-sm text-popover-foreground shadow-md',
              'animate-in fade-in-0 zoom-in-95',
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-border" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  metric: SummaryMetric;
}

function MetricCard({ metric }: MetricCardProps) {
  const iconStyle = accentBgStyle(metric.accent);

  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
      <div
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 44, height: 44, ...iconStyle }}
        aria-hidden="true"
      >
        {createElement(resolveIcon(metric.icon), { className: 'size-5' })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {metric.label}
          </span>
          <MetricTooltip content={metric.tooltip} />
        </div>

        <span
          className="text-2xl font-bold text-foreground"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {metric.value}
        </span>

        {metric.secondary && (
          <span className="text-xs text-muted-foreground">{metric.secondary}</span>
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
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      role="status"
      aria-busy="true"
      aria-label="Загрузка метрик"
    >
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ))}
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
        className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center"
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} />
      ))}
    </div>
  );
}
