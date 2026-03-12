import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, ArrowDown, ArrowUp, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ForecastDto } from '@/types';

import { InfoTooltip } from './InfoTooltip';
import {
  formatAnalyticsHeroMoney,
  formatAnalyticsMetaMoney,
  formatAnalyticsMoneyRange,
} from './models';

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
  corridorBase: number | null;
  corridorBand: number | null;
  optimistic: number | null;
  risk: number | null;
}

function hasActualData(forecast: ForecastDto): boolean {
  return forecast.series.actual.some((value) => value !== null);
}

function buildChartData(forecast: ForecastDto, showCorridor: boolean): ChartDataPoint[] {
  const { days, actual, optimistic, risk } = forecast.series;

  return days.map((day, index) => {
    const optimisticValue = showCorridor ? (optimistic[index] ?? null) : null;
    const riskValue = showCorridor ? (risk[index] ?? null) : null;

    return {
      day,
      actual: actual[index] ?? null,
      corridorBase: optimisticValue,
      corridorBand:
        optimisticValue !== null && riskValue !== null
          ? Math.max(0, riskValue - optimisticValue)
          : null,
      optimistic: optimisticValue,
      risk: riskValue,
    };
  });
}

function buildXAxisTicks(days: number[]): number[] {
  if (days.length <= 1) {
    return days;
  }

  const ticks = days.filter((day) => (day - 1) % 3 === 0);
  const last = days[days.length - 1];

  if (ticks[ticks.length - 1] !== last) {
    ticks.push(last);
  }

  return ticks;
}

function formatYAxisTick(value: number, currency: string): string {
  return formatAnalyticsMetaMoney(value, currency);
}

function getChartMax(forecast: ForecastDto, showCorridor: boolean): number | undefined {
  const values = [
    ...forecast.series.actual.filter((value): value is number => value !== null),
  ];

  if (showCorridor) {
    values.push(
      ...forecast.series.optimistic.filter((value): value is number => value !== null),
      ...forecast.series.risk.filter((value): value is number => value !== null),
    );
  }

  if (forecast.series.baseline !== null) {
    values.push(forecast.series.baseline);
  }

  if (values.length === 0) {
    return undefined;
  }

  const maxValue = Math.max(...values);
  if (maxValue <= 0) {
    return undefined;
  }

  const padded = maxValue * 1.12;
  if (padded <= 50_000) return Math.ceil(padded / 5_000) * 5_000;
  if (padded <= 150_000) return Math.ceil(padded / 10_000) * 10_000;
  return Math.ceil(padded / 25_000) * 25_000;
}

function buildBaselineNote(
  forecast: ForecastDto,
  currency: string,
  showForecastCorridor: boolean,
) {
  const { optimisticTotal, riskTotal, baselineLimit, currentSpent } = forecast.summary;
  const comparisonTarget =
    showForecastCorridor && optimisticTotal !== null && riskTotal !== null
      ? (optimisticTotal + riskTotal) / 2
      : currentSpent;

  if (baselineLimit === null || comparisonTarget === null || baselineLimit <= 0) {
    return null;
  }

  const diff = comparisonTarget - baselineLimit;

  return {
    tone: diff <= 0 ? 'below' : 'above',
    text:
      diff <= 0
        ? `Ниже базового уровня на ${formatAnalyticsMetaMoney(Math.abs(diff), currency)}`
        : `Выше базового уровня на ${formatAnalyticsMetaMoney(Math.abs(diff), currency)}`,
  } as const;
}

function ForecastTooltip({
  active,
  label,
  payload,
  currency,
  showCorridor,
}: {
  active?: boolean;
  label?: number | string;
  payload?: Array<{ payload: ChartDataPoint }>;
  currency: string;
  showCorridor: boolean;
}) {
  const point = payload?.find((entry) => entry?.payload)?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-md">
      <p className="mb-2 text-[var(--ft-text-secondary)]">День {label}</p>

      {point.actual !== null && (
        <p className="tabular-nums">
          Факт: <span className="font-semibold">{formatAnalyticsMetaMoney(point.actual, currency)}</span>
        </p>
      )}

      {showCorridor &&
        point.optimistic !== null &&
        point.risk !== null &&
        point.risk !== point.optimistic && (
          <>
            <p className="tabular-nums">
              Нижняя граница:{' '}
              <span className="font-semibold">{formatAnalyticsMetaMoney(point.optimistic, currency)}</span>
            </p>
            <p className="tabular-nums">
              Верхняя граница:{' '}
              <span className="font-semibold">{formatAnalyticsMetaMoney(point.risk, currency)}</span>
            </p>
          </>
        )}
    </div>
  );
}

function ChartLegend({
  hasBaseline,
  showCorridor,
}: {
  hasBaseline: boolean;
  showCorridor: boolean;
}) {
  if (!hasBaseline && !showCorridor) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--ft-text-secondary)]">
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-0.5 w-7 rounded"
          style={{ backgroundColor: 'var(--ft-warning-300)' }}
        />
        Факт
      </span>

      {showCorridor && (
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-7 rounded-md border"
            style={{
              borderColor: 'var(--ft-success-400)',
              backgroundColor: 'color-mix(in srgb, var(--ft-success-500) 14%, transparent)',
            }}
          />
          Коридор прогноза
        </span>
      )}

      {hasBaseline && (
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-7 rounded border-t-2"
            style={{
              borderStyle: 'dashed',
              borderColor: 'var(--ft-primary-200)',
              background: 'none',
            }}
          />
          Базовый уровень
        </span>
      )}
    </div>
  );
}

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
  const title = isCurrentMonth ? 'Прогноз расходов' : 'Расходы за месяц';
  const tooltipText = isCurrentMonth
    ? 'Прогноз до конца месяца на основе текущего темпа трат и исторического окна расходов.'
    : 'Фактические расходы за выбранный месяц и сравнение с базовым уровнем.';

  if (!readinessMet) {
    return (
      <Card
        className="gap-0 rounded-[28px] border border-[var(--ft-border-default)] shadow-[var(--ft-shadow-lg)]"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-raised) 84%, var(--ft-bg-base)) 0%, var(--ft-surface-base) 100%)',
        }}
      >
        <div className="flex items-start gap-2 px-6 py-6">
          <h2 className="text-[1.75rem] font-semibold leading-tight text-foreground">{title}</h2>
          <InfoTooltip content={tooltipText} className="-mt-1" ariaLabel="Подробнее о прогнозе расходов" />
        </div>

        <div className="px-6 pb-6">
          <div className="flex min-h-[280px] gap-3 rounded-[24px] border border-[var(--ft-border-subtle)] bg-[color-mix(in_srgb,var(--ft-surface-base)_75%,transparent)] p-5 text-base leading-7 text-[var(--ft-text-secondary)]">
            <Info className="mt-1 size-5 shrink-0" aria-hidden="true" />
            <p>
              {readinessMessage}. Нужны расходы минимум в {requiredExpenseDays} днях. Сейчас есть данные за{' '}
              {observedExpenseDays}.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card
        className="gap-0 rounded-[28px] border border-[var(--ft-border-default)] shadow-[var(--ft-shadow-lg)]"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-raised) 84%, var(--ft-bg-base)) 0%, var(--ft-surface-base) 100%)',
        }}
      >
        <div className="space-y-5 px-6 py-6">
          <div className="flex items-start gap-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="mt-1 size-10 rounded-full" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-14 w-[22rem]" />
          <Skeleton className="h-[408px] rounded-[24px]" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className="gap-0 rounded-[28px] border border-[var(--ft-border-default)] shadow-[var(--ft-shadow-lg)]"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-raised) 84%, var(--ft-bg-base)) 0%, var(--ft-surface-base) 100%)',
        }}
      >
        <div className="flex items-start gap-2 px-6 py-6">
          <h2 className="text-[1.75rem] font-semibold leading-tight text-foreground">{title}</h2>
          <InfoTooltip content={tooltipText} className="-mt-1" ariaLabel="Подробнее о прогнозе расходов" />
        </div>

        <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 px-6 pb-6 text-center">
          <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground">Не удалось построить график</p>
            <p className="text-sm text-[var(--ft-text-secondary)]">{error}</p>
          </div>
          <Button variant="outline" className="min-h-[44px]" onClick={onRetry}>
            Повторить
          </Button>
        </div>
      </Card>
    );
  }

  if (!forecast || !hasActualData(forecast)) {
    return (
      <Card
        className="gap-0 rounded-[28px] border border-[var(--ft-border-default)] shadow-[var(--ft-shadow-lg)]"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-raised) 84%, var(--ft-bg-base)) 0%, var(--ft-surface-base) 100%)',
        }}
      >
        <div className="flex items-start gap-2 px-6 py-6">
          <h2 className="text-[1.75rem] font-semibold leading-tight text-foreground">{title}</h2>
          <InfoTooltip content={tooltipText} className="-mt-1" ariaLabel="Подробнее о прогнозе расходов" />
        </div>

        <div className="px-6 pb-6">
          <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-[var(--ft-border-subtle)] bg-[color-mix(in_srgb,var(--ft-surface-base)_75%,transparent)] px-8 text-center">
            <p className="max-w-md text-base leading-7 text-[var(--ft-text-secondary)]">
              {isCurrentMonth
                ? 'Недостаточно данных для прогноза. Продолжайте добавлять транзакции в течение месяца.'
                : 'Недостаточно данных, чтобы показать итог и сравнение с базовым уровнем.'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const showForecastCorridor =
    isCurrentMonth &&
    forecast.summary.optimisticTotal !== null &&
    forecast.summary.riskTotal !== null;
  const data = buildChartData(forecast, showForecastCorridor);
  const baseline = forecast.series.baseline;
  const xTicks = buildXAxisTicks(forecast.series.days);
  const yMax = getChartMax(forecast, showForecastCorridor);
  const heroLabel = showForecastCorridor ? 'До конца месяца' : 'Итог за месяц';
  const heroValue = showForecastCorridor
    ? formatAnalyticsMoneyRange(
        forecast.summary.optimisticTotal,
        forecast.summary.riskTotal,
        currency,
      )
    : formatAnalyticsHeroMoney(forecast.summary.currentSpent, currency);
  const baselineNote = buildBaselineNote(forecast, currency, showForecastCorridor);
  const baselineLabel =
    forecast.summary.baselineLimit !== null
      ? `Базовый уровень · ${formatAnalyticsMetaMoney(forecast.summary.baselineLimit, currency)}`
      : baseline !== null
        ? `Базовый уровень · ${formatAnalyticsMetaMoney(baseline, currency)}`
        : null;

  return (
    <Card
      className="gap-0 rounded-[28px] border border-[var(--ft-border-default)] shadow-[var(--ft-shadow-lg)]"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-raised) 84%, var(--ft-bg-base)) 0%, var(--ft-surface-base) 100%)',
      }}
    >
      <div className="space-y-5 px-6 py-6">
        <div className="flex items-start gap-2">
          <h2 className="text-[1.75rem] font-semibold leading-tight text-foreground">{title}</h2>
          <InfoTooltip content={tooltipText} className="-mt-1" ariaLabel="Подробнее о прогнозе расходов" />
        </div>

        <div className="space-y-3">
          <p className="text-base text-[var(--ft-text-secondary)]">{heroLabel}</p>
          <p
            className="text-[clamp(2.45rem,5vw,3.5rem)] font-bold leading-none text-[var(--ft-warning-300)]"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {heroValue}
          </p>

          {(baselineNote || baselineLabel) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {baselineNote && (
                <div
                  className="flex items-center gap-2 font-medium"
                  style={{
                    color:
                      baselineNote.tone === 'below'
                        ? 'var(--ft-success-400)'
                        : 'var(--ft-warning-400)',
                  }}
                >
                  {baselineNote.tone === 'below' ? (
                    <ArrowDown className="size-4" aria-hidden="true" />
                  ) : (
                    <ArrowUp className="size-4" aria-hidden="true" />
                  )}
                  <span>{baselineNote.text}</span>
                </div>
              )}

              {baselineLabel && (
                <span className="text-[var(--ft-text-tertiary)]">{baselineLabel}</span>
              )}
            </div>
          )}
        </div>

        <div role="img" aria-label="График расходов по дням месяца">
          <ResponsiveContainer width="100%" height={showForecastCorridor ? 500 : 476}>
            <ComposedChart data={data} margin={{ top: 24, right: 14, left: 4, bottom: 12 }}>
              <defs>
                <linearGradient id="ft-forecast-actual-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="color-mix(in srgb, var(--ft-warning-300) 24%, transparent)"
                  />
                  <stop
                    offset="100%"
                    stopColor="color-mix(in srgb, var(--ft-warning-300) 5%, transparent)"
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                stroke="color-mix(in srgb, var(--ft-border-subtle) 92%, transparent)"
              />
              <XAxis
                dataKey="day"
                ticks={xTicks}
                tick={{ fontSize: 13, fill: 'var(--ft-text-secondary)' }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                domain={yMax != null ? [0, yMax] : [0, 'auto']}
                tickFormatter={(value: number) => formatYAxisTick(value, currency)}
                tick={{ fontSize: 13, fill: 'var(--ft-text-secondary)' }}
                tickLine={false}
                axisLine={false}
                width={88}
              />
              <Tooltip
                content={(props) => {
                  const { active, label, payload } = props as unknown as {
                    active?: boolean;
                    label?: number | string;
                    payload?: Array<{ payload: ChartDataPoint }>;
                  };

                  return (
                    <ForecastTooltip
                      active={active}
                      label={label}
                      payload={payload}
                      currency={currency}
                      showCorridor={showForecastCorridor}
                    />
                  );
                }}
              />

              <Area
                type="monotone"
                dataKey="actual"
                stroke="none"
                fill="url(#ft-forecast-actual-fill)"
                isAnimationActive={false}
              />

              {showForecastCorridor && (
                <>
                  <Area
                    type="monotone"
                    dataKey="corridorBase"
                    stackId="forecast"
                    stroke="none"
                    fill="transparent"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="corridorBand"
                    stackId="forecast"
                    stroke="none"
                    fill="color-mix(in srgb, var(--ft-success-500) 18%, transparent)"
                    isAnimationActive={false}
                  />
                </>
              )}

              <Line
                type="monotone"
                dataKey="actual"
                stroke="var(--ft-warning-300)"
                strokeWidth={3}
                connectNulls={false}
                dot={{
                  r: 4,
                  fill: 'var(--ft-warning-300)',
                  stroke: 'var(--ft-surface-base)',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 5.5,
                  fill: 'var(--ft-warning-300)',
                  stroke: 'var(--ft-surface-base)',
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />

              {baseline !== null && (
                <ReferenceLine
                  y={baseline}
                  stroke="var(--ft-primary-200)"
                  strokeDasharray="6 5"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <ChartLegend hasBaseline={baseline !== null} showCorridor={showForecastCorridor} />
      </div>
    </Card>
  );
}
