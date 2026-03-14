import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/analytics/InfoTooltip';
import { formatCurrency } from '@/utils/format';
import type { InvestmentNetWorthPoint } from './investmentModels';

interface InvestmentsTrendCardProps {
  points: InvestmentNetWorthPoint[];
  currencyCode: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function TrendTooltip({
  active,
  payload,
  currencyCode,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload: InvestmentNetWorthPoint;
  }>;
  currencyCode: string;
}) {
  const entry = payload?.[0]?.payload;

  if (!active || !entry) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="font-semibold text-foreground">{entry.tooltipLabel}</div>
      <div className="mt-1 [font-variant-numeric:tabular-nums]">
        {formatCurrency(entry.value, currencyCode)}
      </div>
    </div>
  );
}

export function InvestmentsTrendCard({
  points,
  currencyCode,
  loading,
  error,
  onRetry,
}: InvestmentsTrendCardProps) {
  const hasData = points.length > 0;
  const showInlineError = Boolean(error) && hasData;
  const gradientId = useId().replace(/:/g, '');

  return (
    <Card className="h-full min-h-[420px] rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-semibold text-foreground">
              Динамика капитала
            </CardTitle>
            <CardDescription>
              Последние 12 месяцев активной части портфеля.
            </CardDescription>
          </div>
          <InfoTooltip content="Показывает, как менялась суммарная стоимость инвестиционного портфеля по месяцам." />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-6">
        {showInlineError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            <div className="font-medium text-foreground">Не удалось обновить динамику</div>
            <div className="mt-1 text-muted-foreground">{error}</div>
            <Button className="mt-3 min-h-[44px]" variant="outline" onClick={onRetry}>
              Повторить
            </Button>
          </div>
        ) : null}

        {loading ? (
          <Skeleton className="min-h-[340px] flex-1 rounded-2xl" />
        ) : error && !hasData ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-8 text-center">
            <p className="font-medium text-foreground">Не удалось загрузить динамику капитала</p>
            <p className="max-w-md text-sm text-muted-foreground">{error}</p>
            <Button className="min-h-[44px]" variant="outline" onClick={onRetry}>
              Повторить
            </Button>
          </div>
        ) : !hasData ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center">
            <p className="font-medium text-foreground">Пока нет истории капитала</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Динамика появится, когда по инвестиционным счетам накопится история операций.
            </p>
          </div>
        ) : (
          <div
            className="min-h-[340px] w-full flex-1"
            role="img"
            aria-label="Линейный график изменения инвестиционного капитала за последние двенадцать месяцев."
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="color-mix(in srgb, var(--ft-chart-1) 28%, transparent)"
                    />
                    <stop
                      offset="100%"
                      stopColor="color-mix(in srgb, var(--ft-chart-1) 5%, transparent)"
                    />
                  </linearGradient>
                </defs>
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
                  domain={[0, 'auto']}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--ft-text-secondary)', fontSize: 12 }}
                  width={76}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat('ru-RU', {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    }).format(value)
                  }
                />
                <Tooltip
                  content={<TrendTooltip currencyCode={currencyCode} />}
                  cursor={{
                    stroke: 'color-mix(in srgb, var(--ft-chart-1) 22%, transparent)',
                    strokeWidth: 1,
                  }}
                />
                <Area
                  type="linear"
                  dataKey="value"
                  stroke="var(--ft-chart-1)"
                  strokeWidth={3}
                  fill={`url(#${gradientId})`}
                  fillOpacity={1}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: 'var(--ft-chart-1)',
                    stroke: 'var(--ft-surface-base)',
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
