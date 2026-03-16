import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import type { AnalyticsDashboardDto } from '@/types';
import { formatCurrency, formatNumber } from '@/utils/format';
import {
  formatPeakSummary,
  getStabilityActionLabel,
  getSummaryDeltaLabel,
  getSummaryScoreStatus,
  getReflectionScoreTone,
  isSummaryDeltaPositive,
} from './reflectionModels';

interface RetrospectiveSummarySnapshotProps {
  summary: AnalyticsDashboardDto | null | undefined;
  currencyCode: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function scoreToneClassName(score: number | null | undefined): string {
  const tone = getReflectionScoreTone(score ?? null);

  if (tone === 'good') {
    return 'border-[var(--ft-success-500)]/30 bg-[color-mix(in_srgb,var(--ft-success-500)_10%,transparent)]';
  }

  if (tone === 'average') {
    return 'border-[var(--ft-warning-500)]/30 bg-[color-mix(in_srgb,var(--ft-warning-500)_10%,transparent)]';
  }

  if (tone === 'poor') {
    return 'border-[var(--ft-danger-500)]/30 bg-[color-mix(in_srgb,var(--ft-danger-500)_10%,transparent)]';
  }

  return 'border-border/70 bg-background/25';
}

function valueToneClassName(tone: 'good' | 'average' | 'poor' | null): string {
  if (tone === 'good') {
    return 'text-[var(--ft-success-400)]';
  }

  if (tone === 'average') {
    return 'text-[var(--ft-warning-300)]';
  }

  if (tone === 'poor') {
    return 'text-[var(--ft-danger-400)]';
  }

  return 'text-foreground';
}

export function RetrospectiveSummarySnapshot({
  summary,
  currencyCode,
  loading,
  error,
  onRetry,
}: RetrospectiveSummarySnapshotProps) {
  if (loading) {
    return (
      <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle className="text-lg font-semibold">Итоги месяца</CardTitle>
          <CardDescription>Снимок финансового состояния за выбранный период.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-[148px] rounded-2xl" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[118px] rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-[56px] rounded-2xl" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border border-destructive/30 bg-destructive/10 shadow-[var(--ft-shadow-sm)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground">
            Не удалось загрузить итоги месяца
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="min-h-[44px]" onClick={onRetry}>
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Итоги месяца</CardTitle>
          <CardDescription>
            Сводка появится, когда для месяца будет доступна аналитика.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const monthDelta = getSummaryDeltaLabel(summary.health.monthOverMonthChangePercent);
  const metricCards = [
    {
      label: 'Сбережения',
      value:
        summary.health.savingsRate != null
          ? `${formatNumber(summary.health.savingsRate * 100, 1)}%`
          : '—',
      sub:
        summary.health.netCashflow != null && summary.health.netCashflow > 0
          ? `+${formatCurrency(summary.health.netCashflow, currencyCode)} сохранено`
          : 'Новая динамика появится после доходов и расходов месяца.',
      tone: 'good' as const,
    },
    {
      label: 'Стабильность трат',
      value:
        summary.health.stabilityScore != null
          ? `${formatNumber(summary.health.stabilityScore, 0)}/100`
          : '—',
      sub:
        getStabilityActionLabel(summary.health.stabilityActionCode) ??
        'Появится, когда накопится достаточно расходных дней.',
      tone: summary.health.stabilityStatus,
    },
    {
      label: 'Необязательные расходы',
      value:
        summary.health.discretionarySharePercent != null
          ? `${formatNumber(summary.health.discretionarySharePercent, 1)}%`
          : '—',
      sub:
        summary.health.discretionaryTotal != null
          ? formatCurrency(summary.health.discretionaryTotal, currencyCode)
          : 'Без данных',
      tone: null,
    },
    {
      label: 'Расходы за месяц',
      value:
        summary.health.monthTotal != null
          ? formatCurrency(summary.health.monthTotal, currencyCode)
          : '—',
      sub:
        summary.health.monthIncome != null
          ? `Доход: ${formatCurrency(summary.health.monthIncome, currencyCode)}`
          : 'Доходы не зафиксированы',
      tone: null,
    },
  ];

  const statChips = [
    summary.health.meanDaily != null
      ? {
          label: 'Средний день',
          value: formatCurrency(summary.health.meanDaily, currencyCode),
        }
      : null,
    summary.health.medianDaily != null
      ? {
          label: 'Медианный день',
          value: formatCurrency(summary.health.medianDaily, currencyCode),
        }
      : null,
    formatPeakSummary(summary, currencyCode)
      ? {
          label: 'Пиковые дни',
          value: formatPeakSummary(summary, currencyCode) as string,
        }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          Итоги месяца
        </CardTitle>
        <CardDescription>
          Краткий снимок того, что происходило с бюджетом за выбранный период.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        <div
          className={cn(
            'flex flex-col gap-4 rounded-[1.4rem] border px-5 py-5 shadow-[var(--ft-shadow-sm)] lg:flex-row lg:items-start lg:justify-between',
            scoreToneClassName(summary.health.totalMonthScore)
          )}
        >
          <div className="space-y-2">
            <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Общий рейтинг
            </div>
            <div className="text-5xl font-semibold tracking-tight text-foreground">
              {summary.health.totalMonthScore != null
                ? `${formatNumber(summary.health.totalMonthScore, 0)}/100`
                : '—'}
            </div>
            {getSummaryScoreStatus(summary.health.totalMonthScore) ? (
              <p className="text-sm text-muted-foreground">
                {getSummaryScoreStatus(summary.health.totalMonthScore)}
              </p>
            ) : null}
          </div>

          {monthDelta ? (
            <div
              className={cn(
                'inline-flex h-fit rounded-full border px-3 py-1.5 text-sm font-medium',
                isSummaryDeltaPositive(summary.health.monthOverMonthChangePercent)
                  ? 'border-[var(--ft-success-500)]/25 bg-[color-mix(in_srgb,var(--ft-success-500)_10%,transparent)] text-[var(--ft-success-400)]'
                  : 'border-border/70 bg-background/35 text-muted-foreground'
              )}
            >
              {monthDelta}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-border/70 bg-background/20 px-4 py-4"
            >
              <div className="text-sm font-medium text-muted-foreground">{card.label}</div>
              <div
                className={cn(
                  'mt-2 text-2xl font-semibold tracking-tight',
                  valueToneClassName(card.tone ?? null)
                )}
              >
                {card.value}
              </div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {card.sub}
              </div>
            </div>
          ))}
        </div>

        {statChips.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {statChips.map((chip) => (
              <div
                key={chip.label}
                className="rounded-full border border-border/70 bg-background/25 px-4 py-2 text-sm"
              >
                <span className="font-medium text-foreground">{chip.label}:</span>{' '}
                <span className="text-muted-foreground">{chip.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
