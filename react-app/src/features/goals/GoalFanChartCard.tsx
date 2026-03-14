import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/format';
import type { GoalChartPoint } from './goalModels';

interface GoalFanChartCardProps {
  loading: boolean;
  points: GoalChartPoint[];
  currencyCode: string;
  targetAmount: number;
}

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

export function GoalFanChartCard({
  loading,
  points,
  currencyCode,
  targetAmount,
}: GoalFanChartCardProps) {
  return (
    <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          Сценарии достижения цели
        </CardTitle>
        <CardDescription>
          Нижняя и верхняя траектории показывают диапазон P25–P75, центральная линия — медианный сценарий.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        {loading ? (
          <Skeleton className="h-[360px] rounded-2xl" />
        ) : points.length === 0 ? (
          <div className="flex h-[360px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Нет данных для отображения. Запустите симуляцию, чтобы увидеть траектории.
          </div>
        ) : (
          <div
            className="h-[360px] w-full"
            role="img"
            aria-label={`График вероятностных сценариев достижения цели ${formatCurrency(
              targetAmount,
              currencyCode
            )}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="color-mix(in srgb, var(--ft-border-default) 70%, transparent)"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--ft-text-secondary)', fontSize: 12 }}
                  minTickGap={20}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--ft-text-secondary)', fontSize: 12 }}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat('ru-RU', {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    }).format(value)
                  }
                />
                <Tooltip content={<FanChartTooltip currencyCode={currencyCode} />} cursor={false} />
                <ReferenceLine
                  y={targetAmount}
                  stroke="var(--ft-danger-400)"
                  strokeDasharray="5 4"
                  ifOverflow="extendDomain"
                />
                <Line
                  type="linear"
                  dataKey="p25"
                  stroke="color-mix(in srgb, var(--ft-primary-400) 55%, transparent)"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="linear"
                  dataKey="p75"
                  stroke="color-mix(in srgb, var(--ft-primary-400) 55%, transparent)"
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
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
