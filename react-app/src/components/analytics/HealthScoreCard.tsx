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
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MetricAccent } from './SummaryStrip';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HealthScoreCardProps {
  title: string;
  icon: string;
  mainValue: string;
  mainLabel: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  accent: MetricAccent;
  tooltip: string;
  subdued?: boolean;
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

// ─── Accent color ─────────────────────────────────────────────────────────────

function accentColor(accent: MetricAccent): string {
  switch (accent) {
    case 'income':
    case 'good':
      return 'var(--ft-success-500)';
    case 'expense':
    case 'poor':
      return 'var(--ft-danger-500)';
    case 'neutral':
    default:
      return 'var(--ft-primary-400)';
  }
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface CardTooltipProps {
  content: string;
}

function CardTooltip({ content }: CardTooltipProps) {
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

// ─── HealthScoreCard ──────────────────────────────────────────────────────────

export function HealthScoreCard({
  title,
  icon,
  mainValue,
  mainLabel,
  secondaryValue,
  secondaryLabel,
  accent,
  tooltip,
  subdued = false,
}: HealthScoreCardProps) {
  const color = accentColor(accent);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card transition-opacity',
        subdued ? 'px-3 py-3 opacity-60' : 'px-4 py-4',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span style={{ color }} aria-hidden="true">
          {createElement(resolveIcon(icon), { className: 'size-4 shrink-0' })}
        </span>

        <span className="flex-1 text-sm font-medium text-foreground">{title}</span>

        <CardTooltip content={tooltip} />
      </div>

      {/* Main value */}
      <div className="flex flex-col gap-0.5">
        <span
          className="text-2xl font-bold text-foreground"
          style={{ fontVariantNumeric: 'tabular-nums', color }}
        >
          {mainValue}
        </span>
        <span className="text-xs text-muted-foreground">{mainLabel}</span>
      </div>

      {/* Secondary value */}
      {secondaryValue !== undefined && (
        <div className="flex flex-col gap-0.5 border-t border-border pt-2">
          <span
            className="text-sm font-semibold text-foreground"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {secondaryValue}
          </span>
          {secondaryLabel && (
            <span className="text-xs text-muted-foreground">{secondaryLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
