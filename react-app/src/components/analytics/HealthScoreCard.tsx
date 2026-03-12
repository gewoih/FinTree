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
import type { MetricAccent, ZoneBarModel } from './models';

interface HealthScoreCardProps {
  title: string;
  icon: string;
  value: string;
  supportingValue?: string;
  supportingLabel: string;
  accent: MetricAccent;
  tooltip: string;
  zoneBar?: ZoneBarModel;
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

function resolveZoneColors(inverted = false) {
  const forward = [
    'var(--ft-danger-500)',
    'var(--ft-warning-500)',
    'var(--ft-success-500)',
  ];

  return inverted ? [...forward].reverse() : forward;
}

function ZoneBar({ model }: { model: ZoneBarModel }) {
  const colors = resolveZoneColors(model.inverted);
  const [warnStart, goodStart] = model.thresholds;
  const poorWidth = `${Math.max((warnStart / model.scaleMax) * 100, 0)}%`;
  const warningWidth = `${Math.max(((goodStart - warnStart) / model.scaleMax) * 100, 0)}%`;
  const goodWidth = `${Math.max(((model.scaleMax - goodStart) / model.scaleMax) * 100, 0)}%`;
  const markerPosition = `${Math.min(
    100,
    Math.max(0, ((model.value ?? 0) / model.scaleMax) * 100),
  )}%`;

  return (
    <div className="mt-auto pt-5">
      <div className="relative h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ft-surface-overlay)_72%,transparent)]">
        <div className="flex h-full w-full">
          <div style={{ width: poorWidth, backgroundColor: colors[0] }} />
          <div style={{ width: warningWidth, backgroundColor: colors[1] }} />
          <div style={{ width: goodWidth, backgroundColor: colors[2] }} />
        </div>

        <span
          className="absolute top-1/2 h-3.5 w-1.5 -translate-y-1/2 rounded-full border border-[var(--ft-surface-base)] bg-[var(--ft-text-primary)] shadow-[var(--ft-shadow-xs)]"
          style={{ left: `calc(${markerPosition} - 0.1875rem)` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function HealthScoreCard({
  title,
  icon,
  value,
  supportingValue,
  supportingLabel,
  accent,
  tooltip,
  zoneBar,
}: HealthScoreCardProps) {
  const color = accentColor(accent);

  return (
    <div
      className={cn(
        'flex h-full flex-col gap-4 rounded-[24px] border border-[var(--ft-border-subtle)] px-5 py-5 shadow-[var(--ft-shadow-xs)]',
      )}
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-base) 94%, var(--ft-bg-base)) 0%, color-mix(in srgb, var(--ft-surface-raised) 92%, var(--ft-bg-base)) 100%)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full"
            style={{
              color,
              backgroundColor: accentBgColor(accent),
            }}
            aria-hidden="true"
          >
            {createElement(resolveIcon(icon), { className: 'size-5 shrink-0' })}
          </div>

          <span className="pt-2 text-base font-semibold text-foreground">{title}</span>
        </div>

        <InfoTooltip
          content={tooltip}
          className="-mt-2 -mr-2"
          ariaLabel={`Подробнее: ${title}`}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <span
          className="text-[clamp(2.1rem,3.5vw,2.45rem)] font-bold leading-none"
          style={{ fontVariantNumeric: 'tabular-nums', color }}
        >
          {value}
        </span>

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

        {zoneBar && <ZoneBar model={zoneBar} />}
      </div>
    </div>
  );
}
