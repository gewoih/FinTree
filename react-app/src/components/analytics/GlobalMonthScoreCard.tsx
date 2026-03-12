import type { ReactNode } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { StabilityStatusCode } from '@/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlobalMonthScoreCardProps {
  loading: boolean;
  error: string | null;
  score: number | null;
  scoreStatus: StabilityStatusCode | null;
  children?: ReactNode;
  onRetry: () => void;
}

// ─── Score color helper ───────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score < 40) return 'var(--ft-danger-500)';
  if (score <= 70) return 'var(--ft-warning-500)';
  return 'var(--ft-success-500)';
}

// ─── Score label ──────────────────────────────────────────────────────────────

function scoreStatusLabel(status: StabilityStatusCode | null): string {
  switch (status) {
    case 'good':
      return 'Отличное состояние';
    case 'average':
      return 'Удовлетворительно';
    case 'poor':
      return 'Требует внимания';
    default:
      return 'Финансовое здоровье';
  }
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const CHILD_SKELETON_KEYS = ['sk-a', 'sk-b', 'sk-c', 'sk-d'] as const;

function ScoreLoadingSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label="Загрузка данных"
    >
      {/* Score circle */}
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-32 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Children placeholders */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CHILD_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-[72px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Score circle ─────────────────────────────────────────────────────────────

interface ScoreCircleProps {
  score: number;
  status: StabilityStatusCode | null;
}

function ScoreCircle({ score, status }: ScoreCircleProps) {
  const color = scoreColor(score);
  const label = scoreStatusLabel(status);

  // SVG ring parameters
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex items-center justify-center"
        style={{ width: 128, height: 128 }}
        role="img"
        aria-label={`Финансовый score: ${score} из 100`}
      >
        {/* Track */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={128}
          height={128}
          viewBox="0 0 128 128"
          aria-hidden="true"
        >
          <circle
            cx={64}
            cy={64}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={8}
            className="text-border"
          />
          <circle
            cx={64}
            cy={64}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>

        {/* Value */}
        <span
          className="text-4xl font-bold leading-none"
          style={{ color, fontVariantNumeric: 'tabular-nums' }}
        >
          {score}
        </span>
      </div>

      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── GlobalMonthScoreCard ─────────────────────────────────────────────────────

export function GlobalMonthScoreCard({
  loading,
  error,
  score,
  scoreStatus,
  children,
  onRetry,
}: GlobalMonthScoreCardProps) {
  if (loading) {
    return <ScoreLoadingSkeleton />;
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center"
        role="alert"
      >
        <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-foreground">Не удалось загрузить данные</p>
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

  if (score === null) {
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

  return (
    <div className="flex flex-col gap-6">
      <ScoreCircle score={score} status={scoreStatus} />

      {children && (
        <div
          className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2')}
        >
          {children}
        </div>
      )}
    </div>
  );
}
