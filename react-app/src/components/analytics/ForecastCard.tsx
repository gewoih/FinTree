import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, RefreshCw, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { ForecastDto } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForecastCardProps {
  loading: boolean;
  error: string | null;
  forecast: ForecastDto | null;
  currency: string;
  isCurrentMonth: boolean;
  readinessMet: boolean;
  readinessMessage: string;
  observedExpenseDays: number;
  requiredExpenseDays: number;
  onRetry: () => void;
}

interface ChartDataPoint {
  day: number;
  actual: number | null;
  optimistic: number | null;
  risk: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildChartData(forecast: ForecastDto): ChartDataPoint[] {
  const { days, actual, optimistic, risk } = forecast.series;
  return days.map((day, i) => ({
    day,
    actual: actual[i] ?? null,
    optimistic: optimistic[i] ?? null,
    risk: risk[i] ?? null,
  }));
}

function hasActualData(forecast: ForecastDto): boolean {
  return forecast.series.actual.some((v) => v !== null);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KpiRowProps {
  forecast: ForecastDto;
  currency: string;
  isCurrentMonth: boolean;
}

function KpiRow({ forecast, currency, isCurrentMonth }: KpiRowProps) {
  const { summary } = forecast;

  let label: string;
  let value: string;

  if (isCurrentMonth && summary.optimisticTotal != null && summary.riskTotal != null) {
    label = 'Прогноз до конца месяца';
    value = `${formatCurrency(summary.optimisticTotal, currency)} — ${formatCurrency(summary.riskTotal, currency)}`;
  } else {
    label = 'Итого за месяц';
    value = summary.currentSpent != null ? formatCurrency(summary.currentSpent, currency) : '—';
  }

  let baselineNote: { text: string; positive: boolean } | null = null;
  if (summary.baselineLimit != null && summary.currentSpent != null) {
    const diff = summary.baselineLimit - summary.currentSpent;
    const pct = summary.currentSpent !== 0 ? Math.abs(diff / summary.currentSpent) * 100 : 0;
    const below = diff > 0;
    baselineNote = {
      text: `На ${formatCurrency(Math.abs(diff), currency)} (${formatPercent(pct)}) ${below ? 'ниже' : 'выше'} базовых расходов`,
      positive: below,
    };
  }

  return (
    <div className="flex flex-col gap-1 px-4 pt-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className="text-xl font-bold text-foreground"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </span>
      {baselineNote && (
        <span
          className="text-xs font-medium"
          style={{
            color: baselineNote.positive
              ? 'var(--ft-success-500)'
              : 'var(--ft-danger-500)',
          }}
        >
          {baselineNote.text}
        </span>
      )}
    </div>
  );
}

interface ChartLegendProps {
  hasBaseline: boolean;
}

function ChartLegend({ hasBaseline }: ChartLegendProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-0.5 w-5 rounded"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
        Факт
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-0.5 w-5 rounded border-t-2"
          style={{
            borderStyle: 'dashed',
            borderColor: 'var(--ft-warning-500)',
            background: 'none',
          }}
        />
        Коридор прогноза
      </span>
      {hasBaseline && (
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5 rounded border-t-2"
            style={{
              borderStyle: 'dashed',
              borderColor: 'var(--ft-primary-400)',
              background: 'none',
            }}
          />
          Базовые расходы
        </span>
      )}
    </div>
  );
}

// ─── ForecastCard ─────────────────────────────────────────────────────────────

export function ForecastCard({
  loading,
  error,
  forecast,
  currency,
  isCurrentMonth,
  readinessMet,
  readinessMessage,
  observedExpenseDays,
  requiredExpenseDays,
  onRetry,
}: ForecastCardProps) {
  // Priority 1: readiness not met
  if (!readinessMet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Прогноз расходов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              {readinessMessage}. Нужны расходы минимум в {requiredExpenseDays} днях. Сейчас:{' '}
              {observedExpenseDays}.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Priority 2: loading
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-6 w-56" />
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Priority 3: error
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Прогноз расходов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={onRetry} className="min-h-[44px]">
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Повторить
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Priority 4: empty
  if (!forecast || !hasActualData(forecast)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Прогноз расходов</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Недостаточно данных для прогноза</p>
        </CardContent>
      </Card>
    );
  }

  // Priority 5: success
  const data = buildChartData(forecast);
  const baseline = forecast.series.baseline;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Прогноз расходов</CardTitle>
      </CardHeader>
      <KpiRow forecast={forecast} currency={currency} isCurrentMonth={isCurrentMonth} />
      <CardContent className="pt-4">
        <div
          role="img"
          aria-label="График прогноза расходов по дням месяца"
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v: number) => formatCurrency(v, currency)}
                stroke="var(--color-muted-foreground)"
              />
              <Tooltip
                content={(props) => {
                  const { active, payload, label } = props as unknown as {
                    active?: boolean;
                    payload?: Array<{ name: string; value: number | null }>;
                    label?: number;
                  };
                  if (!active || !payload?.length) return null;
                  const lineLabels: Record<string, string> = {
                    actual: 'Факт',
                    optimistic: 'Оптимистично',
                    risk: 'Пессимистично',
                  };
                  return (
                    <div
                      style={{
                        background: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        padding: '8px 12px',
                      }}
                    >
                      <p style={{ marginBottom: 4, color: 'var(--color-muted-foreground)' }}>
                        День {label}
                      </p>
                      {payload.map((p) => (
                        <p key={p.name} style={{ margin: '2px 0' }}>
                          {lineLabels[p.name] ?? p.name}:{' '}
                          {p.value !== null ? formatCurrency(p.value, currency) : '—'}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              {baseline != null && (
                <ReferenceLine
                  y={baseline}
                  stroke="var(--ft-primary-400)"
                  strokeDasharray="4 2"
                  label={{
                    value: formatCurrency(baseline, currency),
                    position: 'insideTopRight',
                    fontSize: 11,
                    fill: 'var(--ft-primary-400)',
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="optimistic"
                stroke="var(--ft-warning-500)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="risk"
                stroke="var(--ft-danger-500)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartLegend hasBaseline={baseline != null} />
      </CardContent>
    </Card>
  );
}
