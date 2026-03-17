import { createElement } from 'react';
import {
  Shield,
  Banknote,
  Activity,
  Percent,
  Wallet,
  ShoppingBag,
  ChartNoAxesColumnIncreasing,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/utils/cn';

import { InfoTooltip } from './InfoTooltip';
import { analyticsHeroStyle, analyticsInsetClassName } from './analyticsTokens';
import type { MetricAccent } from './models';

interface HealthScoreCardProps {
  title: string;
  icon: string;
  value: string;
  supportingValue?: string;
  supportingLabel: string;
  accent: MetricAccent;
  tooltip: string;
  progress?: number;
  isPreview?: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Banknote,
  Activity,
  Percent,
  Wallet,
  ShoppingBag,
  ChartNoAxesColumnIncreasing,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Activity;
}

function accentColor(accent: MetricAccent): string {
  switch (accent) {
    case 'income':
    case 'good':
      return 'var(--ft-success-500)';
    case 'expense':
    case 'poor':
      return 'var(--ft-danger-500)';
    case 'warning':
      return 'var(--ft-warning-400)';
    case 'neutral':
    default:
      return 'var(--ft-primary-400)';
  }
}

function accentBgColor(accent: MetricAccent): string {
  switch (accent) {
    case 'income':
    case 'good':
      return 'color-mix(in srgb, var(--ft-success-500) 16%, transparent)';
    case 'expense':
    case 'poor':
      return 'color-mix(in srgb, var(--ft-danger-500) 16%, transparent)';
    case 'warning':
      return 'color-mix(in srgb, var(--ft-warning-500) 16%, transparent)';
    case 'neutral':
    default:
      return 'color-mix(in srgb, var(--ft-text-secondary) 10%, transparent)';
  }
}

export function HealthScoreCard({
  title,
  icon,
  value,
  supportingValue,
  supportingLabel,
  accent,
  tooltip,
  progress,
  isPreview,
}: HealthScoreCardProps) {
  const color = accentColor(accent);

  return (
    <div
      className={cn(
        'flex h-full flex-col gap-4 px-5 py-5 shadow-[var(--ft-shadow-xs)]',
        analyticsInsetClassName,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-lg"
            style={{
              color,
              backgroundColor: accentBgColor(accent),
            }}
            aria-hidden="true"
          >
            {createElement(resolveIcon(icon), { className: 'size-5 shrink-0' })}
          </div>

          <div className="flex flex-col gap-1 pt-2">
            <span className="text-base font-semibold text-foreground">{title}</span>
            {isPreview && (
              <span
                className="w-fit rounded px-1.5 py-0.5 text-xs font-medium"
                style={{
                  color: 'var(--ft-text-secondary)',
                  backgroundColor: 'color-mix(in srgb, var(--ft-text-secondary) 12%, transparent)',
                }}
              >
                мало данных
              </span>
            )}
          </div>
        </div>

        <InfoTooltip
          content={tooltip}
          className="-mt-2 -mr-2"
          ariaLabel={`Подробнее: ${title}`}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <span
          className="text-foreground"
          style={{ ...analyticsHeroStyle, color, fontSize: 'var(--ft-text-3xl)' }}
        >
          {value}
        </span>

        {progress !== undefined && (
          <div
            className="h-1 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: 'var(--ft-border-default)' }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title}: ${value}`}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }}
            />
          </div>
        )}

        <div className="space-y-1 text-sm text-[var(--ft-text-secondary)]">
          {supportingValue && (
            <p
              className="font-semibold text-foreground"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {supportingValue}
              <span className="ml-2 font-normal text-[var(--ft-text-secondary)]">
                {supportingLabel}
              </span>
            </p>
          )}

          {!supportingValue && <p className="leading-6">{supportingLabel}</p>}
        </div>
      </div>
    </div>
  );
}
