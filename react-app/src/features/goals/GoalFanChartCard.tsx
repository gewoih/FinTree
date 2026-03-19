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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/format';
import type { GoalChartPoint } from './goalModels';

interface GoalFanChartCardProps {
  loading: boolean;
  points: GoalChartPoint[];
  currencyCode: string;
  targetAmount: number;
  className?: string;
}

interface GoalChartDataPoint extends GoalChartPoint {
  band: number;
}

const Y_AXIS_NUMBER_FORMATTER = new Intl.NumberFormat('ru-RU', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function FanChartTooltip({
  active,
  payload,
  currencyCode,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    dataKey?: string;
    value?: number;
    payload: GoalChartPoint;
  }>;
  currencyCode: string;
}) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="font-semibold text-foreground">{point.tooltipLabel}</div>
      <div className="mt-2 space-y-1 [font-variant-numeric:tabular-nums]">
        <div>P25: {formatCurrency(point.p25, currencyCode)}</div>
        <div>P50: {formatCurrency(point.p50, currencyCode)}</div>
        <div>P75: {formatCurrency(point.p75, currencyCode)}</div>
        <div>Цель: {formatCurrency(point.target, currencyCode)}</div>
      </div>
    </div>
  );
}

function buildChartData(points: GoalChartPoint[]): GoalChartDataPoint[] {
  return points.map((point) => ({
    ...point,
    band: Math.max(0, point.p75 - point.p25),
  }));
}

function getChartDomain(points: GoalChartPoint[], targetAmount: number): [number, number] {
  const values = points.flatMap((point) => [point.p25, point.p50, point.p75, targetAmount]);
  const initialCapital =
    points.length > 0 ? Math.min(points[0].p25, points[0].p50, points[0].p75) : 0;

  if (values.length === 0) {
    const fallbackMax = Math.max(1, targetAmount * 1.2);
    return [0, fallbackMax];
  }

  const maxValue = Math.max(...values);

  if (!Number.isFinite(initialCapital) || !Number.isFinite(maxValue)) {
    return [0, Math.max(1, targetAmount * 1.2)];
  }

  if (initialCapital === maxValue) {
    const padding = Math.max(1, maxValue * 0.12);
    return [initialCapital, maxValue + padding];
  }

  const padding = Math.max((maxValue - initialCapital) * 0.12, maxValue * 0.03);
  return [initialCapital, maxValue + padding];
}

export function GoalFanChartCard({
  loading,
  points,
  currencyCode,
  targetAmount,
  className,
}: GoalFanChartCardProps) {
  const chartData = buildChartData(points);
  const chartDomain = getChartDomain(points, targetAmount);

  return (
    <div
      className={cn(
        'rounded-[1.5rem] border border-border/70 bg-background/40 p-3 sm:p-4',
        className
      )}
    >
      {loading ? (
        <Skeleton className="h-[320px] rounded-[1.25rem] sm:h-[360px] lg:h-[460px] xl:h-[500px]" />
      ) : points.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 text-center text-sm text-muted-foreground sm:h-[360px] lg:h-[460px] xl:h-[500px]">
          Нет данных для отображения. Запустите симуляцию, чтобы увидеть траектории достижения цели.
        </div>
      ) : (
        <div
          className="h-[320px] w-full sm:h-[360px] lg:h-[460px] xl:h-[500px] [&_*:focus]:outline-none [&_*:focus-visible]:outline-none"
          role="img"
          aria-label={`График вероятностных сценариев достижения цели ${formatCurrency(
            targetAmount,
            currencyCode
          )}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 8, left: 4, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="color-mix(in srgb, var(--ft-border-default) 72%, transparent)"
              />
              <XAxis
                dataKey="tooltipLabel"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--ft-text-secondary)', fontSize: 12 }}
                minTickGap={32}
                tickFormatter={(_value: string, index: number) => chartData[index]?.label ?? ''}
              />
              <YAxis
                type="number"
                domain={chartDomain}
                allowDataOverflow
                width={72}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--ft-text-secondary)', fontSize: 12 }}
                tickFormatter={(value: number) => Y_AXIS_NUMBER_FORMATTER.format(value)}
              />
              <Tooltip content={<FanChartTooltip currencyCode={currencyCode} />} cursor={false} />
              <ReferenceLine
                y={targetAmount}
                stroke="var(--ft-danger-400)"
                strokeDasharray="6 5"
                ifOverflow="extendDomain"
              />
              <Area
                type="linear"
                dataKey="p25"
                stackId="fan"
                stroke="transparent"
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                type="linear"
                dataKey="band"
                stackId="fan"
                stroke="transparent"
                fill="color-mix(in srgb, var(--ft-primary-400) 16%, transparent)"
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="p25"
                stroke="color-mix(in srgb, var(--ft-primary-400) 58%, transparent)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="linear"
                dataKey="p75"
                stroke="color-mix(in srgb, var(--ft-primary-400) 58%, transparent)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="linear"
                dataKey="p50"
                stroke="var(--ft-primary-400)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
