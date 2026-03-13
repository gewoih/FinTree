import type { ReactNode } from 'react';
import { AlertCircle, Info } from 'lucide-react';

import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsPanel } from './analyticsTheme';
import { analyticsHeroStyle } from './analyticsTokens';

import type { GlobalScoreModel } from './models';

interface GlobalMonthScoreCardProps {
  loading: boolean;
  error: string | null;
  model: GlobalScoreModel;
  children?: ReactNode;
  onRetry: () => void;
}

function scoreColor(accent: GlobalScoreModel['accent']): string {
  switch (accent) {
    case 'excellent':
      return 'var(--ft-success-400)';
    case 'good':
      return 'var(--ft-primary-400)';
    case 'average':
      return 'var(--ft-warning-300)';
    case 'poor':
      return 'var(--ft-warning-400)';
    case 'critical':
      return 'var(--ft-danger-400)';
    default:
      return 'var(--ft-text-primary)';
  }
}

function deltaColor(tone: GlobalScoreModel['deltaTone']): string {
  switch (tone) {
    case 'better':
      return 'var(--ft-success-400)';
    case 'worse':
      return 'var(--ft-danger-400)';
    default:
      return 'var(--ft-text-secondary)';
  }
}

const CHILD_SKELETON_KEYS = ['sk-a', 'sk-b', 'sk-c', 'sk-d'] as const;

function ScoreLoadingSkeleton() {
  return (
    <AnalyticsPanel ariaLabel="Загрузка данных">
      <div className="grid grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.6fr)]">
        <div className="flex h-full flex-col justify-center gap-5">
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-16 w-44" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
          <Skeleton className="h-6 w-44" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CHILD_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-[210px] rounded-lg" />
          ))}
        </div>
      </div>
    </AnalyticsPanel>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center"
      role="status"
    >
      <Info className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        Добавьте несколько транзакций, чтобы увидеть метрики
      </p>
    </div>
  );
}

function ScoreMainBlock({ model }: { model: GlobalScoreModel }) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-center gap-4">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ft-text-secondary)]">
          Общий рейтинг месяца
        </p>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <p
            className="text-foreground"
            style={{
              ...analyticsHeroStyle,
              color: scoreColor(model.accent),
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {model.scoreLabel}
          </p>

          <span
            className="pb-2 text-sm font-semibold"
            style={{ color: deltaColor(model.deltaTone) }}
          >
            {model.deltaLabel ?? 'Нет данных для сравнения'}
          </span>
        </div>

        <p className="max-w-[24rem] text-base leading-7 text-[var(--ft-text-secondary)]">
          {model.description}
        </p>
      </div>
    </div>
  );
}

export function GlobalMonthScoreCard({
  loading,
  error,
  model,
  children,
  onRetry,
}: GlobalMonthScoreCardProps) {
  if (loading) {
    return <ScoreLoadingSkeleton />;
  }

  if (error) {
    return (
      <div
        className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center"
        role="alert"
      >
        <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-foreground">Не удалось загрузить общий рейтинг месяца</p>
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

  if (model.score === null) {
    return <EmptyState />;
  }

  return (
    <AnalyticsPanel>
      <div className="grid grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.55fr)]">
        <ScoreMainBlock model={model} />

        {children && (
          <div className={cn('grid grid-cols-1 gap-3.5 sm:grid-cols-2')}>
            {children}
          </div>
        )}
      </div>
    </AnalyticsPanel>
  );
}
