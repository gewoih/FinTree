import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import * as analyticsApi from '@/api/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercent, formatYearMonth } from '@/utils/format';
import type { EvolutionMonthDto } from '@/types';
import { cn } from '@/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvolutionTabProps {
  isActive: boolean;
}

type RangeOption = { label: string; value: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGE_OPTIONS: RangeOption[] = [
  { label: '6 мес', value: 6 },
  { label: '12 мес', value: 12 },
  { label: 'Всё', value: 0 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return 'inherit';
  if (score < 40) return 'var(--ft-danger-500)';
  if (score <= 70) return 'var(--ft-warning-500)';
  return 'var(--ft-success-500)';
}

function avg(values: (number | null)[]): number {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function median(values: (number | null)[]): number {
  const valid = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 === 0 ? (valid[mid - 1] + valid[mid]) / 2 : valid[mid];
}

type TrendDirection = 'up' | 'down' | 'flat';

function calcTrend(
  months: EvolutionMonthDto[],
  getter: (m: EvolutionMonthDto) => number | null,
): TrendDirection {
  const values = months.map(getter);
  const mid = Math.ceil(values.length / 2);
  const firstHalf = avg(values.slice(0, mid));
  const secondHalf = avg(values.slice(mid));
  if (secondHalf > firstHalf + 0.001) return 'up';
  if (secondHalf < firstHalf - 0.001) return 'down';
  return 'flat';
}

// ─── TrendIcon ────────────────────────────────────────────────────────────────

function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') {
    return (
      <TrendingUp
        className="size-3.5"
        style={{ color: 'var(--ft-success-500)' }}
        aria-label="тренд вверх"
      />
    );
  }
  if (direction === 'down') {
    return (
      <TrendingDown
        className="size-3.5"
        style={{ color: 'var(--ft-danger-500)' }}
        aria-label="тренд вниз"
      />
    );
  }
  return null;
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  trend: TrendDirection;
  accent?: string;
}

function KpiCard({ label, value, trend, accent }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <TrendIcon direction={trend} />
      </div>
      <span
        className="text-lg font-bold"
        style={{ fontVariantNumeric: 'tabular-nums', color: accent ?? 'var(--ft-text-primary)' }}
      >
        {value}
      </span>
    </div>
  );
}

interface KpiSectionProps {
  months: EvolutionMonthDto[];
}

function KpiSection({ months }: KpiSectionProps) {
  const withData = months.filter((m) => m.hasData);

  const avgScore = avg(withData.map((m) => m.totalMonthScore));
  const scoreDir = calcTrend(withData, (m) => m.totalMonthScore);

  const avgSavings = avg(withData.map((m) => m.savingsRate));
  const savingsDir = calcTrend(withData, (m) => m.savingsRate);

  const avgStability = avg(withData.map((m) => m.stabilityScore));
  const stabilityDir = calcTrend(withData, (m) => m.stabilityScore);

  const medLiquid = median(withData.map((m) => m.liquidMonths));
  const liquidDir = calcTrend(withData, (m) => m.liquidMonths);

  const avgDiscretionary = avg(withData.map((m) => m.discretionaryPercent));
  const discretionaryDir = calcTrend(withData, (m) => m.discretionaryPercent);

  return (
    <div className="flex flex-col gap-3">
      {/* Hero card */}
      <div
        className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4"
        aria-label="Средний финансовый балл за период"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Средний балл за период</span>
          <TrendIcon direction={scoreDir} />
        </div>
        <span
          className="text-3xl font-bold"
          style={{ fontVariantNumeric: 'tabular-nums', color: scoreColor(avgScore) }}
        >
          {Math.round(avgScore)} / 100
        </span>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Средняя норма сбережений"
          value={`${formatPercent(avgSavings)}`}
          trend={savingsDir}
        />
        <KpiCard
          label="Средняя стабильность"
          value={`${Math.round(avgStability)}`}
          trend={stabilityDir}
        />
        <KpiCard
          label="Медиана подушки"
          value={`${medLiquid.toFixed(1)} мес`}
          trend={liquidDir}
        />
        <KpiCard
          label="Средний % дискреционных"
          value={`${formatPercent(avgDiscretionary)}`}
          trend={discretionaryDir}
        />
      </div>
    </div>
  );
}

// ─── EvolutionMonthlyTable ────────────────────────────────────────────────────

interface EvolutionMonthlyTableProps {
  months: EvolutionMonthDto[];
  currency: string;
}

function EvolutionMonthlyTable({ months, currency }: EvolutionMonthlyTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Месяц</th>
            <th className="px-4 py-3 text-right font-medium">Score</th>
            <th className="px-4 py-3 text-right font-medium">Сбережения</th>
            <th className="px-4 py-3 text-right font-medium">Стабильность</th>
            <th className="px-4 py-3 text-right font-medium">Подушка</th>
            <th className="px-4 py-3 text-right font-medium">Средний день</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => {
            const key = `${m.year}-${m.month}`;
            const empty = !m.hasData;
            return (
              <tr
                key={key}
                className={cn(
                  'border-b border-border last:border-b-0 transition-colors',
                  empty ? 'opacity-40' : 'hover:bg-muted/20',
                )}
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {formatYearMonth(m.year, m.month)}
                </td>
                <td
                  className="px-4 py-3 text-right font-semibold tabular-nums"
                  style={{ color: scoreColor(m.totalMonthScore) }}
                >
                  {empty || m.totalMonthScore === null ? '—' : `${Math.round(m.totalMonthScore)} / 100`}
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums"
                  style={{
                    color: empty || m.savingsRate === null
                      ? undefined
                      : m.savingsRate > 15
                        ? 'var(--ft-success-500)'
                        : m.savingsRate < 0
                          ? 'var(--ft-danger-500)'
                          : undefined,
                  }}
                >
                  {empty || m.savingsRate === null ? '—' : `${m.savingsRate.toFixed(1)}%`}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {empty || m.stabilityScore === null ? '—' : Math.round(m.stabilityScore)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {empty || m.liquidMonths === null ? '—' : `${m.liquidMonths.toFixed(1)} мес`}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {empty || m.meanDaily === null ? '—' : formatCurrency(m.meanDaily, currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── EvolutionTab ─────────────────────────────────────────────────────────────

export function EvolutionTab({ isActive }: EvolutionTabProps) {
  const [selectedRange, setSelectedRange] = useState<number>(6);

  const evolutionQuery = useQuery({
    queryKey: ['analytics-evolution', selectedRange],
    queryFn: () => analyticsApi.getEvolution(selectedRange),
    staleTime: 60_000,
    enabled: isActive,
  });

  const { data, isLoading, error, refetch } = evolutionQuery;

  // Derive currency from context — fall back to RUB if unavailable
  const currency = 'RUB';

  return (
    <div className="flex flex-col gap-6">
      {/* Range selector */}
      <div className="flex items-center gap-2" role="group" aria-label="Выбор периода">
        {RANGE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={selectedRange === opt.value ? 'default' : 'outline'}
            size="sm"
            className="min-h-[44px] px-4"
            onClick={() => setSelectedRange(opt.value)}
            aria-pressed={selectedRange === opt.value}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                <span>Не удалось загрузить данные динамики</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="min-h-[44px]"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Повторить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && !error && data && data.filter((m) => m.hasData).length === 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Нет данных за выбранный период</p>
          </CardContent>
        </Card>
      )}

      {/* Success */}
      {!isLoading && !error && data && data.filter((m) => m.hasData).length > 0 && (
        <>
          <KpiSection months={data} />
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-foreground">По месяцам</h3>
            <EvolutionMonthlyTable months={[...data].reverse()} currency={currency} />
          </div>
        </>
      )}
    </div>
  );
}
