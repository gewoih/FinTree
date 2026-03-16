import { AlertCircle, Info, LoaderCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GoalSimulationResultDto } from '@/types';
import type { GoalChartPoint, GoalDataQualityModel } from './goalModels';
import { GoalDataQualityCard } from './GoalDataQualityCard';
import { GoalFanChartCard } from './GoalFanChartCard';
import { formatGoalProbability, formatGoalTargetAmount } from './goalUtils';
import { cn } from '@/utils/cn';

interface GoalNoticeProps {
  icon: LucideIcon;
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'error';
}

function GoalNotice({
  icon: Icon,
  children,
  tone = 'neutral',
}: GoalNoticeProps) {
  const toneClassName =
    tone === 'warning'
      ? 'border-[var(--ft-warning-500)]/30 bg-[var(--ft-warning-500)]/10'
      : tone === 'error'
        ? 'border-destructive/30 bg-destructive/10'
        : 'border-border/80 bg-muted/20';
  const iconClassName =
    tone === 'warning'
      ? 'text-[var(--ft-warning-400)]'
      : tone === 'error'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm', toneClassName)}>
      <div className="flex items-start gap-2 text-foreground">
        <Icon className={cn('mt-0.5 size-4 shrink-0', iconClassName)} />
        <div>{children}</div>
      </div>
    </div>
  );
}

interface ProjectionStatProps {
  label: string;
  value: string;
  emphasis?: boolean;
}

function ProjectionStat({
  label,
  value,
  emphasis = false,
}: ProjectionStatProps) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border p-5',
        emphasis
          ? 'border-primary/20 bg-primary/5'
          : 'border-border/80 bg-background/40'
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-4 font-semibold leading-tight [font-variant-numeric:tabular-nums]',
          emphasis
            ? 'text-3xl text-primary sm:text-4xl'
            : 'text-2xl text-foreground sm:text-[2rem]'
        )}
      >
        {value}
      </div>
    </div>
  );
}

interface GoalProjectionSummaryProps {
  targetAmount: number | null;
  currencyCode: string;
  loading: boolean;
  error: string | null;
  result: GoalSimulationResultDto | null;
  timelineMedian: string;
  achievementRangeText: string;
  points: GoalChartPoint[];
  dataQuality: GoalDataQualityModel | null;
  hasPendingChanges: boolean;
}

export function GoalProjectionSummary({
  targetAmount,
  currencyCode,
  loading,
  error,
  result,
  timelineMedian,
  achievementRangeText,
  points,
  dataQuality,
  hasPendingChanges,
}: GoalProjectionSummaryProps) {
  const hasValidTarget = (targetAmount ?? 0) > 0;
  const showIdleHint = hasValidTarget && !loading && !result && !error;
  const hasAchievableResult = Boolean(result?.isAchievable);
  const showChartLegend = points.length > 0 || dataQuality != null;

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-2xl font-semibold text-foreground">
              Прогноз достижения
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              Сначала смотрите на медианный срок, затем оценивайте диапазон сценариев на графике.
              Чем уже коридор P25–P75, тем стабильнее прогноз.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
              Цель: {formatGoalTargetAmount(Math.max(0, targetAmount ?? 0), currencyCode)}
            </Badge>
            {loading ? (
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">
                <LoaderCircle className="size-3.5 animate-spin" />
                Пересчитываем
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {!hasValidTarget ? <GoalNotice icon={AlertCircle} tone="warning">Введите целевую сумму больше нуля.</GoalNotice> : null}

        {error ? <GoalNotice icon={AlertCircle} tone="error">{error}</GoalNotice> : null}

        {hasPendingChanges && result ? (
          <GoalNotice icon={Info}>
            На экране показан последний рассчитанный прогноз. Если вы меняли параметры выше,
            нажмите «Пересчитать прогноз», чтобы обновить результат.
          </GoalNotice>
        ) : null}

        {showIdleHint ? (
          <GoalNotice icon={Info}>
            Нажмите «Пересчитать прогноз», чтобы запустить симуляцию.
          </GoalNotice>
        ) : null}

        {result && hasAchievableResult ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_repeat(2,minmax(0,1fr))]">
            <ProjectionStat label="Медианный срок" value={timelineMedian} emphasis />
            <ProjectionStat
              label="Вероятность"
              value={formatGoalProbability(result.probability)}
            />
            <ProjectionStat label="Диапазон P25–P75" value={achievementRangeText} />
          </div>
        ) : null}

        {result && !hasAchievableResult ? (
          <div className="rounded-[1.5rem] border border-[var(--ft-warning-500)]/30 bg-[var(--ft-warning-500)]/10 p-5">
            <div className="text-lg font-semibold text-foreground">
              Цель пока не достигается при текущем сценарии
            </div>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Расходы превышают доходы или свободный денежный поток слишком мал. Попробуйте
              скорректировать доходы, расходы, доходность или целевую сумму и запустите новый расчёт.
            </p>
          </div>
        ) : null}

        <GoalFanChartCard
          loading={loading}
          points={points}
          currencyCode={currencyCode}
          targetAmount={Math.max(0, targetAmount ?? 0)}
        />

        {showChartLegend ? (
          <div className="flex flex-col gap-4 border-t border-border/60 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {points.length > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-8 rounded-full bg-[var(--ft-primary-400)]" />
                    Медианный сценарий
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-8 rounded-full bg-[color-mix(in_srgb,var(--ft-primary-400)_16%,transparent)]" />
                    Диапазон P25–P75
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-8 rounded-full border-t-2 border-dashed border-[var(--ft-danger-400)]" />
                    Линия цели
                  </div>
                </>
              ) : null}
            </div>

            {dataQuality ? <GoalDataQualityCard quality={dataQuality} compact /> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
