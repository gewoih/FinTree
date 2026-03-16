import type { ComponentProps, ReactNode } from 'react';

import { AlertCircle } from 'lucide-react';

import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { InfoTooltip } from './InfoTooltip';
import {
  analyticsInsetClassName,
  analyticsPanelClassName,
  analyticsTitleStyle,
} from './analyticsTokens';

interface AnalyticsPanelProps {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  role?: ComponentProps<'div'>['role'];
  'aria-busy'?: ComponentProps<'div'>['aria-busy'];
}

export function AnalyticsPanel({
  children,
  className,
  ariaLabel,
  role,
  'aria-busy': ariaBusy,
}: AnalyticsPanelProps) {
  return (
    <Card
      className={cn(analyticsPanelClassName, className)}
      aria-label={ariaLabel}
      role={role}
      aria-busy={ariaBusy}
    >
      {children}
    </Card>
  );
}

interface AnalyticsSectionHeaderProps {
  title: string;
  tooltip?: string;
  ariaLabel?: string;
  actions?: ReactNode;
  className?: string;
}

export function AnalyticsSectionHeader({
  title,
  tooltip,
  ariaLabel,
  actions,
  className,
}: AnalyticsSectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-6 py-6 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <h2 className="min-w-0 text-foreground" style={analyticsTitleStyle}>
          {title}
        </h2>
        {tooltip && (
          <InfoTooltip
            content={tooltip}
            className="-mt-1"
            ariaLabel={ariaLabel ?? `Подробнее: ${title}`}
          />
        )}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

interface AnalyticsStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  className?: string;
}

export function AnalyticsState({
  title,
  description,
  onRetry,
  className,
}: AnalyticsStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 pb-6 text-center',
        className,
      )}
      role={onRetry ? 'alert' : 'status'}
    >
      {onRetry && <AlertCircle className="size-8 text-destructive" aria-hidden="true" />}
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="text-sm text-[var(--ft-text-secondary)]">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" className="min-h-[44px]" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}

interface AnalyticsInsetProps {
  children: ReactNode;
  className?: string;
}

export function AnalyticsInset({ children, className }: AnalyticsInsetProps) {
  return <div className={cn(analyticsInsetClassName, className)}>{children}</div>;
}

interface AnalyticsSegmentedControlProps<TValue extends string | number> {
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
  onChange: (value: TValue) => void;
  className?: string;
}

export function AnalyticsSegmentedControl<TValue extends string | number>({
  options,
  value,
  onChange,
  className,
}: AnalyticsSegmentedControlProps<TValue>) {
  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-[var(--ft-border-default)] bg-[var(--ft-analytics-surface-subtle)] p-1',
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-[44px] rounded-md px-4 text-sm font-medium transition-colors',
              active
                ? 'bg-card text-foreground shadow-[var(--ft-shadow-xs)]'
                : 'text-[var(--ft-text-secondary)] hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
