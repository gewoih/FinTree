import { AlertCircle, CheckCircle2, LoaderCircle, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GoalSimulationResultDto } from '@/types';
import { formatGoalProbability, formatGoalTargetAmount } from './goalUtils';

interface GoalProjectionSummaryProps {
  targetAmount: number | null;
  currencyCode: string;
  loading: boolean;
  error: string | null;
  result: GoalSimulationResultDto | null;
  canRunSimulation: boolean;
  timelineMedian: string;
  achievementRangeText: string;
  onRunSimulation: () => void;
}

export function GoalProjectionSummary({
  targetAmount,
  currencyCode,
  loading,
  error,
  result,
  canRunSimulation,
  timelineMedian,
  achievementRangeText,
  onRunSimulation,
}: GoalProjectionSummaryProps) {
  const hasValidTarget = (targetAmount ?? 0) > 0;
  const showIdleHint =
    hasValidTarget && !loading && !result && !error;

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-xl font-semibold text-foreground">
              Прогноз достижения
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Цель: {formatGoalTargetAmount(Math.max(0, targetAmount ?? 0), currencyCode)}
            </p>
          </div>

          <Button
            className="min-h-[44px] rounded-xl px-5"
            onClick={onRunSimulation}
            disabled={!canRunSimulation}
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Target className="size-4" />}
            Пересчитать прогноз
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {!hasValidTarget ? (
          <div className="rounded-xl border border-[var(--ft-warning-500)]/30 bg-[var(--ft-warning-500)]/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <AlertCircle className="size-4 text-[var(--ft-warning-400)]" />
              Введите целевую сумму больше нуля
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <AlertCircle className="size-4 text-destructive" />
              {error}
            </div>
          </div>
        ) : null}

        {result && !result.isAchievable ? (
          <div className="rounded-xl border border-[var(--ft-warning-500)]/30 bg-[var(--ft-warning-500)]/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <AlertCircle className="size-4 text-[var(--ft-warning-400)]" />
              При текущих параметрах цель недостижима: расходы превышают доходы.
            </div>
          </div>
        ) : null}

        {showIdleHint ? (
          <div className="rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Нажмите «Пересчитать прогноз», чтобы запустить симуляцию.
          </div>
        ) : null}

        {result && result.isAchievable ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Медианный срок
              </div>
              <div className="mt-3 text-2xl font-semibold text-primary [font-variant-numeric:tabular-nums]">
                {timelineMedian}
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/15 p-4">
              <div className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Вероятность
              </div>
              <div className="mt-3 text-2xl font-semibold text-foreground [font-variant-numeric:tabular-nums]">
                {formatGoalProbability(result.probability)}
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/15 p-4">
              <div className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Диапазон P25–P75
              </div>
              <div className="mt-3 text-lg font-semibold text-foreground [font-variant-numeric:tabular-nums]">
                {achievementRangeText}
              </div>
            </div>
          </div>
        ) : result && !result.isAchievable ? (
          <div className="rounded-2xl border border-border/80 bg-muted/15 px-4 py-4 text-sm text-muted-foreground">
            Попробуйте скорректировать параметры симуляции или увеличить цель только после роста свободного денежного потока.
          </div>
        ) : null}

        {result && result.isAchievable ? (
          <div className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--ft-success-500)_24%,transparent)] bg-[color-mix(in_srgb,var(--ft-success-500)_12%,transparent)] px-4 py-3 text-sm text-foreground">
            <CheckCircle2 className="size-4 text-[var(--ft-success-400)]" />
            Результат построен с учётом текущих параметров и доступной истории операций.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
