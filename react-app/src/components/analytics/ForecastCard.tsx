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
import { ArrowDown, ArrowUp, CheckCircle2, Info } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import type { ForecastDto } from '@/types';

import {
  AnalyticsInset,
  AnalyticsPanel,
  AnalyticsSectionHeader,
  AnalyticsState,
} from './analyticsTheme';
import { analyticsHeroStyle } from './analyticsTokens';
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
  medianForecast: number | null;
}

function hasActualData(forecast: ForecastDto): boolean {
  return forecast.series.actual.some((value) => value !== null);
}

function buildChartData(forecast: ForecastDto, showCorridor: boolean): ChartDataPoint[] {
  const { days, actual } = forecast.series;
  const { optimisticTotal, riskTotal, medianTotal } = forecast.summary;

  let lastActualIndex = -1;
  for (let i = actual.length - 1; i >= 0; i--) {
    if (actual[i] !== null) { lastActualIndex = i; break; }
  }
  const lastDay = days[days.length - 1];
  const observedDay = lastActualIndex >= 0 ? days[lastActualIndex] : null;
  const observedActual = lastActualIndex >= 0 ? actual[lastActualIndex] : null;

  return days.map((day, index) => {
    let corridorBase: number | null = null;
    let corridorBand: number | null = null;
    let medianForecast: number | null = null;

    if (
      showCorridor &&
      observedDay !== null &&
      observedActual !== null &&
      day >= observedDay &&
      lastDay > observedDay
    ) {
      const t = (day - observedDay) / (lastDay - observedDay);

      if (optimisticTotal !== null) {
        corridorBase = observedActual + t * (optimisticTotal - observedActual);
      }
      if (optimisticTotal !== null && riskTotal !== null) {
        const riskPoint = observedActual + t * (riskTotal - observedActual);
        corridorBand = Math.max(0, riskPoint - corridorBase!);
      }
      if (medianTotal !== null) {
        medianForecast = observedActual + t * (medianTotal - observedActual);
      }
    }

    return {
      day,
      actual: actual[index] ?? null,
      corridorBase,
      corridorBand,
      medianForecast,
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

function getChartMin(forecast: ForecastDto): number {
  const values = forecast.series.actual.filter((v): v is number => v !== null);
  if (values.length === 0) return 0;
  const minValue = Math.min(...values);
  if (minValue <= 0) return 0;
  // Floor to the nearest step below 88% of the min value
  const floored = minValue * 0.88;
  if (floored <= 50_000) return Math.floor(floored / 5_000) * 5_000;
  if (floored <= 150_000) return Math.floor(floored / 10_000) * 10_000;
  return Math.floor(floored / 25_000) * 25_000;
}

function getChartMax(forecast: ForecastDto, showCorridor: boolean): number | undefined {
  const values = [
    ...forecast.series.actual.filter((value): value is number => value !== null),
  ];

  if (showCorridor) {
    if (forecast.summary.optimisticTotal !== null) values.push(forecast.summary.optimisticTotal);
    if (forecast.summary.riskTotal !== null) values.push(forecast.summary.riskTotal);
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

  const padded = maxValue * 1.05;
  if (padded <= 50_000) return Math.ceil(padded / 5_000) * 5_000;
  if (padded <= 150_000) return Math.ceil(padded / 10_000) * 10_000;
  return Math.ceil(padded / 10_000) * 10_000;
}

function buildBaselineNote(
  forecast: ForecastDto,
  currency: string,
  showForecastCorridor: boolean,
) {
  const { baselineLimit, currentSpent } = forecast.summary;
  const comparisonTarget =
    showForecastCorridor && forecast.summary.medianTotal !== null
      ? forecast.summary.medianTotal
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

      {showCorridor && point.medianForecast !== null && (
        <p className="tabular-nums">
          Медиана:{' '}
          <span className="font-semibold">{formatAnalyticsMetaMoney(point.medianForecast, currency)}</span>
        </p>
      )}

      {showCorridor &&
        point.corridorBase !== null &&
        point.corridorBand !== null &&
        point.corridorBand > 0 && (
          <>
            <p className="tabular-nums">
              Нижняя граница:{' '}
              <span className="font-semibold">{formatAnalyticsMetaMoney(point.corridorBase, currency)}</span>
            </p>
            <p className="tabular-nums">
              Верхняя граница:{' '}
              <span className="font-semibold">
                {formatAnalyticsMetaMoney(point.corridorBase + point.corridorBand, currency)}
              </span>
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
          style={{ backgroundColor: 'var(--ft-chart-1)' }}
        />
        Факт
      </span>

      {showCorridor && (
        <>
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-7 rounded border-t-2"
              style={{
                borderStyle: 'dashed',
                borderColor: 'var(--ft-chart-1)',
                background: 'none',
              }}
            />
            Медианный прогноз
          </span>
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
        </>
      )}

      {hasBaseline && (
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-7 rounded border-t-2"
            style={{
              borderStyle: 'dashed',
              borderColor: 'var(--ft-chart-baseline)',
              background: 'none',
            }}
          />
          Базовый уровень
        </span>
      )}
    </div>
  );
}

function ForecastHeroSection({
  forecast,
  showForecastCorridor,
  heroLabel,
  heroValue,
  heroRange,
  currency,
  baselineNote,
}: {
  forecast: ForecastDto;
  showForecastCorridor: boolean;
  heroLabel: string;
  heroValue: string;
  heroRange: string | null;
  currency: string;
  baselineNote: ReturnType<typeof buildBaselineNote>;
}) {
  return (
    <div className="space-y-3">
      <p className="text-base text-[var(--ft-text-secondary)]">{heroLabel}</p>
      <p className="text-[var(--ft-chart-1)]" style={analyticsHeroStyle}>
        {heroValue}
      </p>

      {heroRange && (
        <p className="text-sm text-[var(--ft-text-secondary)] tabular-nums">{heroRange}</p>
      )}

      {showForecastCorridor &&
        forecast.summary.medianTotal !== null &&
        forecast.summary.currentSpent !== null && (() => {
          const remaining = forecast.summary.medianTotal! - forecast.summary.currentSpent!;
          return (
            <div
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: remaining > 0 ? 'var(--ft-text-secondary)' : 'var(--ft-success-400)' }}
            >
              {remaining <= 0 ? (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              ) : (
                <Info className="size-4" aria-hidden="true" />
              )}
              <span>
                {remaining > 0
                  ? `До конца месяца ещё ~${formatAnalyticsMetaMoney(remaining, currency)}`
                  : `Расходы на месяц уже достигнуты`}
              </span>
            </div>
          );
        })()}

      {baselineNote && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div
            className="flex items-center gap-2 font-medium"
            style={{
              color:
                baselineNote.tone === 'below' ? 'var(--ft-success-400)' : 'var(--ft-warning-400)',
            }}
          >
            {baselineNote.tone === 'below' ? (
              <ArrowDown className="size-4" aria-hidden="true" />
            ) : (
              <ArrowUp className="size-4" aria-hidden="true" />
            )}
            <span>{baselineNote.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ForecastChart({
  data,
  xTicks,
  yMin,
  yMax,
  baseline,
  baselineValueLabel,
  showForecastCorridor,
  currency,
}: {
  data: ChartDataPoint[];
  xTicks: number[];
  yMin: number;
  yMax: number | undefined;
  baseline: number | null;
  baselineValueLabel: string | null;
  showForecastCorridor: boolean;
  currency: string;
}) {
  return (
    <div role="img" aria-label="График расходов по дням месяца">
      <ResponsiveContainer width="100%" height={showForecastCorridor ? 500 : 476}>
        <ComposedChart data={data} margin={{ top: 24, right: 14, left: 4, bottom: 12 }}>
          <defs>
            <linearGradient id="ft-forecast-actual-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="color-mix(in srgb, var(--ft-chart-1) 24%, transparent)" />
              <stop offset="100%" stopColor="color-mix(in srgb, var(--ft-chart-1) 5%, transparent)" />
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
            domain={yMax != null ? [yMin, yMax] : [yMin, 'auto']}
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

          {showForecastCorridor && (
            <Line
              type="monotone"
              dataKey="medianForecast"
              stroke="var(--ft-chart-1)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}

          <Line
            type="monotone"
            dataKey="actual"
            stroke="var(--ft-chart-1)"
            strokeWidth={3}
            connectNulls={false}
            dot={{
              r: 4,
              fill: 'var(--ft-chart-1)',
              stroke: 'var(--ft-surface-base)',
              strokeWidth: 2,
            }}
            activeDot={{
              r: 5.5,
              fill: 'var(--ft-chart-1)',
              stroke: 'var(--ft-surface-base)',
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />

          {baseline !== null && (
            <ReferenceLine
              y={baseline}
              stroke="var(--ft-chart-baseline)"
              strokeDasharray="6 5"
              label={
                baselineValueLabel
                  ? {
                      value: baselineValueLabel,
                      position: 'insideTopLeft',
                      fill: 'var(--ft-chart-baseline)',
                      fontSize: 12,
                      fontWeight: 600,
                    }
                  : undefined
              }
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
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
      <AnalyticsPanel>
        <AnalyticsSectionHeader
          title={title}
          tooltip={tooltipText}
          ariaLabel="Подробнее о прогнозе расходов"
        />
        <div className="px-6 pb-6">
          <AnalyticsInset className="flex min-h-[280px] gap-3 p-5 text-base leading-7 text-[var(--ft-text-secondary)]">
            <Info className="mt-1 size-5 shrink-0" aria-hidden="true" />
            <p>
              {readinessMessage}. Нужны расходы минимум в {requiredExpenseDays} днях. Сейчас есть данные за{' '}
              {observedExpenseDays}.
            </p>
          </AnalyticsInset>
        </div>
      </AnalyticsPanel>
    );
  }

  if (loading) {
    return (
      <AnalyticsPanel>
        <div className="space-y-5 px-6 py-6">
          <div className="flex items-start gap-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="mt-1 size-10 rounded-full" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-14 w-[22rem]" />
          <Skeleton className="h-[408px] rounded-lg" />
        </div>
      </AnalyticsPanel>
    );
  }

  if (error) {
    return (
      <AnalyticsPanel>
        <AnalyticsSectionHeader
          title={title}
          tooltip={tooltipText}
          ariaLabel="Подробнее о прогнозе расходов"
        />
        <AnalyticsState title="Не удалось построить график" description={error} onRetry={onRetry} />
      </AnalyticsPanel>
    );
  }

  if (!forecast || !hasActualData(forecast)) {
    return (
      <AnalyticsPanel>
        <AnalyticsSectionHeader
          title={title}
          tooltip={tooltipText}
          ariaLabel="Подробнее о прогнозе расходов"
        />
        <div className="px-6 pb-6">
          <AnalyticsInset className="flex min-h-[280px] items-center justify-center px-8 text-center">
            <p className="max-w-md text-base leading-7 text-[var(--ft-text-secondary)]">
              {isCurrentMonth
                ? 'Недостаточно данных для прогноза. Продолжайте добавлять транзакции в течение месяца.'
                : 'Недостаточно данных, чтобы показать итог и сравнение с базовым уровнем.'}
            </p>
          </AnalyticsInset>
        </div>
      </AnalyticsPanel>
    );
  }

  const showForecastCorridor =
    isCurrentMonth &&
    forecast.summary.optimisticTotal !== null &&
    forecast.summary.riskTotal !== null &&
    forecast.summary.medianTotal !== null;
  const chartData = buildChartData(forecast, showForecastCorridor);
  const baseline = forecast.series.baseline;
  const xTicks = buildXAxisTicks(forecast.series.days);
  const yMin = getChartMin(forecast);
  const yMax = getChartMax(forecast, showForecastCorridor);
  const heroLabel = showForecastCorridor ? 'До конца месяца' : 'Итог за месяц';
  const heroValue = showForecastCorridor
    ? formatAnalyticsHeroMoney(forecast.summary.medianTotal, currency)
    : formatAnalyticsHeroMoney(forecast.summary.currentSpent, currency);
  const heroRange =
    showForecastCorridor &&
    forecast.summary.optimisticTotal !== null &&
    forecast.summary.riskTotal !== null
      ? formatAnalyticsMoneyRange(forecast.summary.optimisticTotal, forecast.summary.riskTotal, currency)
      : null;
  const baselineNote = buildBaselineNote(forecast, currency, showForecastCorridor);
  const baselineValueLabel =
    forecast.summary.baselineLimit !== null
      ? formatAnalyticsMetaMoney(forecast.summary.baselineLimit, currency)
      : baseline !== null
        ? formatAnalyticsMetaMoney(baseline, currency)
        : null;

  return (
    <AnalyticsPanel>
      <div className="space-y-5 px-6 py-6">
        <AnalyticsSectionHeader
          title={title}
          tooltip={tooltipText}
          ariaLabel="Подробнее о прогнозе расходов"
          className="px-0 py-0"
        />

        <ForecastHeroSection
          forecast={forecast}
          showForecastCorridor={showForecastCorridor}
          heroLabel={heroLabel}
          heroValue={heroValue}
          heroRange={heroRange}
          currency={currency}
          baselineNote={baselineNote}
        />

        <ForecastChart
          data={chartData}
          xTicks={xTicks}
          yMin={yMin}
          yMax={yMax}
          baseline={baseline}
          baselineValueLabel={baselineValueLabel}
          showForecastCorridor={showForecastCorridor}
          currency={currency}
        />

        <ChartLegend hasBaseline={baseline !== null} showCorridor={showForecastCorridor} />
      </div>
    </AnalyticsPanel>
  );
}
