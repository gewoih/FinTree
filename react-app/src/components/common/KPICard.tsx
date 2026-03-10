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
        colorClass:
          trend.direction === 'up'
            ? 'bg-green-500/10 text-green-500'
            : trend.direction === 'down'
              ? 'bg-red-500/10 text-red-500'
              : 'bg-muted/30 text-muted-foreground',
      }
    : null;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-4',
        variant === 'success' && 'border-l-4 border-l-green-500',
        variant === 'warning' && 'border-l-4 border-l-yellow-500',
        variant === 'danger' && 'border-l-4 border-l-red-500',
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
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold',
                  trendConfig.colorClass
                )}
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
