import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsSegmentedControl } from '@/components/analytics/analyticsTheme';
import type { RetrospectiveListItemDto } from '@/types';
import {
  buildReflectionChartData,
  REFLECTION_RANGE_OPTIONS,
  type ReflectionChartDatum,
  type ReflectionChartRange,
} from './reflectionModels';

interface ReflectionsHistoryChartProps {
  items: RetrospectiveListItemDto[];
  range: ReflectionChartRange;
  onRangeChange: (range: ReflectionChartRange) => void;
}

function HistoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: ReflectionChartDatum }>;
}) {
  const entry = payload?.[0]?.payload;

  if (!active || !entry) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{entry.month}</p>
      <div className="mt-2 grid gap-1 text-[var(--ft-text-secondary)]">
        <p>Дисциплина: {entry.disciplineRating || '—'}</p>
        <p>Контроль импульсов: {entry.impulseControlRating || '—'}</p>
        <p>Уверенность: {entry.confidenceRating || '—'}</p>
      </div>
      <p className="mt-2 font-medium text-foreground">Итог: {entry.total}/15</p>
    </div>
  );
}

export function ReflectionsHistoryChart({
  items,
  range,
  onRangeChange,
}: ReflectionsHistoryChartProps) {
  const chartData = buildReflectionChartData(items, range);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardHeader className="gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="text-lg font-semibold text-foreground">
            История самооценки
          </CardTitle>
          <CardDescription>
            Три метрики складываются в общую картину месяца. Быстро видно, где ритм стал лучше, а где начались просадки.
          </CardDescription>
        </div>

        <AnalyticsSegmentedControl
          options={REFLECTION_RANGE_OPTIONS}
          value={range}
          onChange={onRangeChange}
        />
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        <div
          className="h-[320px] w-full"
          role="img"
          aria-label="Столбчатая диаграмма истории самооценки по месяцам"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid
                vertical={false}
                stroke="color-mix(in srgb, var(--ft-border-subtle) 92%, transparent)"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--ft-text-secondary)', fontSize: 12 }}
              />
              <YAxis
                domain={[0, 15]}
                tickCount={4}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--ft-text-secondary)', fontSize: 12 }}
              />
              <Tooltip
                content={(props) => (
                  <HistoryTooltip
                    active={props.active}
                    payload={props.payload as ReadonlyArray<{ payload: ReflectionChartDatum }>}
                  />
                )}
                cursor={{
                  fill: 'color-mix(in srgb, var(--ft-primary-400) 10%, transparent)',
                }}
              />
              <Bar
                stackId="total"
                dataKey="disciplineRating"
                name="Дисциплина"
                fill="var(--ft-chart-1)"
                radius={[0, 0, 6, 6]}
                isAnimationActive={false}
              />
              <Bar
                stackId="total"
                dataKey="impulseControlRating"
                name="Контроль импульсов"
                fill="var(--ft-chart-category-2)"
                isAnimationActive={false}
              />
              <Bar
                stackId="total"
                dataKey="confidenceRating"
                name="Финансовая уверенность"
                fill="var(--ft-chart-category-3)"
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[var(--ft-chart-1)]" />
            Дисциплина
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[var(--ft-chart-category-2)]" />
            Контроль импульсов
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[var(--ft-chart-category-3)]" />
            Финансовая уверенность
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
