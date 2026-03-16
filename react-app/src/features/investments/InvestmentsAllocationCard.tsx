import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/analytics/InfoTooltip';
import { getTopAnchoredDonutAngles } from '@/components/analytics/donutAngles';
import { formatCurrency, formatNumber } from '@/utils/format';
import type { InvestmentAllocationSlice } from './investmentModels';

const CHART_COLORS = [
  'var(--ft-chart-category-1)',
  'var(--ft-chart-category-2)',
  'var(--ft-chart-category-3)',
  'var(--ft-chart-category-4)',
  'var(--ft-chart-category-5)',
  'var(--ft-chart-category-6)',
];

interface InvestmentsAllocationCardProps {
  slices: InvestmentAllocationSlice[];
  baseCurrencyCode: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function AllocationTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload: InvestmentAllocationSlice;
  }>;
  currency: string;
}) {
  const entry = payload?.[0]?.payload;

  if (!active || !entry) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="font-semibold text-foreground">{entry.name}</div>
      <div className="mt-1 [font-variant-numeric:tabular-nums]">
        {formatCurrency(entry.value, currency)}
      </div>
      <div className="text-xs text-muted-foreground">{formatNumber(entry.share, 1)}%</div>
    </div>
  );
}

export function InvestmentsAllocationCard({
  slices,
  baseCurrencyCode,
  loading,
  error,
  onRetry,
}: InvestmentsAllocationCardProps) {
  const { startAngle, endAngle } = getTopAnchoredDonutAngles();
  const totalValue = slices.reduce((sum, item) => sum + item.value, 0);
  const hasData = slices.length > 0;
  const showInlineError = Boolean(error) && hasData;

  return (
    <Card className="h-full min-h-[420px] rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-semibold text-foreground">
              Распределение по счетам
            </CardTitle>
            <CardDescription>
              Структура активной части портфеля в базовой валюте.
            </CardDescription>
          </div>
          <InfoTooltip content="Показывает, на какие инвестиционные счета распределён текущий капитал." />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-6">
        {showInlineError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            <div className="font-medium text-foreground">Не удалось обновить распределение</div>
            <div className="mt-1 text-muted-foreground">{error}</div>
            <Button className="mt-3 min-h-[44px]" variant="outline" onClick={onRetry}>
              Повторить
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(280px,1.05fr)_minmax(240px,0.95fr)]">
            <div className="flex items-center justify-center">
              <Skeleton className="size-[280px] rounded-full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={`allocation-${index + 1}`} className="h-[54px] rounded-xl" />
              ))}
            </div>
          </div>
        ) : error && !hasData ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-8 text-center">
            <p className="font-medium text-foreground">Не удалось загрузить распределение</p>
            <p className="max-w-md text-sm text-muted-foreground">{error}</p>
            <Button className="min-h-[44px]" variant="outline" onClick={onRetry}>
              Повторить
            </Button>
          </div>
        ) : !hasData ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center">
            <p className="font-medium text-foreground">Нет структуры портфеля</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Добавьте инвестиционные счета и операции, чтобы увидеть распределение капитала.
            </p>
          </div>
        ) : (
          <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(280px,1.05fr)_minmax(240px,0.95fr)] lg:items-center">
            <div
              className="relative mx-auto min-h-[340px] w-full max-w-[320px]"
              role="img"
              aria-label={`Распределение портфеля по счетам. Общая сумма ${formatCurrency(totalValue, baseCurrencyCode)}.`}
            >
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="64%"
                    outerRadius="100%"
                    paddingAngle={2}
                    stroke="var(--ft-surface-base)"
                    strokeWidth={2}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    isAnimationActive={false}
                  >
                    {slices.map((slice, index) => (
                      <Cell
                        key={slice.id}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<AllocationTooltip currency={baseCurrencyCode} />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
                <span className="max-w-[188px] text-[clamp(0.95rem,0.82rem+0.5vw,1.2rem)] font-semibold leading-tight tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
                  {formatCurrency(totalValue, baseCurrencyCode)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/10 p-2">
              <ul className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                {slices.map((slice, index) => (
                  <li
                    key={slice.id}
                    className="grid min-h-[54px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5"
                  >
                    <span
                      className="inline-block size-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{slice.name}</p>
                      <p className="truncate text-sm text-muted-foreground [font-variant-numeric:tabular-nums]">
                        {formatCurrency(slice.value, baseCurrencyCode)}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-foreground [font-variant-numeric:tabular-nums]">
                      {formatNumber(slice.share, 1)}%
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
