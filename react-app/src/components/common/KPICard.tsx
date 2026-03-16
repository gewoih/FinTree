import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Skeleton } from '../ui/skeleton';

interface TrendInfo {
  value: number;
  direction: 'up' | 'down' | 'neutral';
  label?: string;
}

interface KPICardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: TrendInfo | null;
  loading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function KPICard({
  label,
  value,
  icon,
  trend,
  loading,
  variant = 'default',
  className,
}: KPICardProps) {
  const trendConfig = trend
    ? {
        icon:
          trend.direction === 'up'
            ? '↑'
            : trend.direction === 'down'
              ? '↓'
              : '—',
        style:
          trend.direction === 'up'
            ? {
                backgroundColor: 'color-mix(in srgb, var(--ft-success-500) 10%, transparent)',
                color: 'var(--ft-success-500)',
              }
            : trend.direction === 'down'
              ? {
                  backgroundColor: 'color-mix(in srgb, var(--ft-danger-500) 10%, transparent)',
                  color: 'var(--ft-danger-500)',
                }
              : {
                  backgroundColor: 'color-mix(in srgb, var(--ft-bg-elevated) 30%, transparent)',
                  color: 'var(--ft-text-secondary)',
                },
      }
    : null;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-4',
        variant === 'success' && 'border-l-4 border-l-[var(--ft-success-500)]',
        variant === 'warning' && 'border-l-4 border-l-[var(--ft-warning-500)]',
        variant === 'danger' && 'border-l-4 border-l-[var(--ft-danger-500)]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {icon && <span className="text-muted-foreground" aria-hidden="true">{icon}</span>}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Загрузка метрики">
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-9 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      ) : (
        <>
          <div
            className="text-3xl leading-tight font-bold text-foreground"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </div>

          {trend && trendConfig && (
            <div className="flex items-center gap-2 text-sm">
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold"
                style={trendConfig.style}
              >
                <span aria-hidden="true">{trendConfig.icon}</span>
                <span>{Math.abs(trend.value)}%</span>
              </span>
              {trend.label && (
                <span className="text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
