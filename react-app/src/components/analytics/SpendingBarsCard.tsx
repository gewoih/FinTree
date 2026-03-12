import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SpendingBreakdownDto, MonthlyExpenseDto } from '@/types';

import { InfoTooltip } from './InfoTooltip';
import { formatAnalyticsMetaMoney } from './models';

type ExpenseGranularity = 'days' | 'weeks' | 'months';

interface SpendingBarsCardProps {
  loading: boolean;
  error: string | null;
  spending: SpendingBreakdownDto | null;
  currency: string;
  granularity: ExpenseGranularity;
  granularityOptions: Array<{ label: string; value: ExpenseGranularity }>;
  onGranularityChange: (g: ExpenseGranularity) => void;
  onRetry: () => void;
}

const SHORT_MONTH_FMT = new Intl.DateTimeFormat('ru-RU', { month: 'short' });

function buildXLabel(entry: MonthlyExpenseDto, granularity: ExpenseGranularity): string {
  if (granularity === 'days') {
    const date = new Date(entry.year, entry.month - 1, entry.day ?? 1);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  if (granularity === 'weeks') {
    return `${entry.week ?? ''} нед.`;
  }

  return SHORT_MONTH_FMT.format(new Date(entry.year, entry.month - 1, 1));
}

function computeAverage(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx] ?? 0;
}

function formatYTick(value: number, currency: string): string {
  return formatAnalyticsMetaMoney(value, currency);
}

function getAverageLabel(granularity: ExpenseGranularity): string {
  if (granularity === 'days') return 'Средний расход в день';
  if (granularity === 'weeks') return 'Средний расход в неделю';
  return 'Средний расход в месяц';
}

function BarsTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; amount: number } }>;
  currency: string;
}) {
  const entry = payload?.[0]?.payload;
  if (!active || !entry) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-[var(--ft-text-secondary)]">{entry.label}</p>
      <p className="font-semibold tabular-nums text-foreground">
        {formatAnalyticsMetaMoney(entry.amount, currency)}
      </p>
    </div>
  );
}

export function SpendingBarsCard({
  loading,
  error,
  spending,
  currency,
  granularity,
  granularityOptions,
  onGranularityChange,
  onRetry,
}: SpendingBarsCardProps) {
  const rawItems: MonthlyExpenseDto[] = spending?.[granularity] ?? [];
  const amounts = rawItems.map((item) => item.amount);
  const average = computeAverage(amounts);

  const sorted = [...amounts].sort((left, right) => left - right);
  const p85 = percentile(sorted, 85);
  const hasOutliers = amounts.length > 0 && Math.max(...amounts) > average * 3;
  const yMax = hasOutliers ? p85 * 1.2 : undefined;

  const chartData = rawItems.map((item) => ({
    label: buildXLabel(item, granularity),
    amount: item.amount,
    barAmount: hasOutliers && yMax != null && item.amount > yMax ? yMax : item.amount,
  }));

  const isEmpty = !loading && !error && rawItems.length === 0;

  return (
    <Card
      className="gap-0 rounded-[28px] border border-[var(--ft-border-default)] shadow-[var(--ft-shadow-lg)]"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-raised) 84%, var(--ft-bg-base)) 0%, var(--ft-surface-base) 100%)',
      }}
    >
      <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <h2 className="text-[1.75rem] font-semibold leading-tight text-foreground">
            Динамика расходов
          </h2>
          <InfoTooltip
            content="Показывает динамику расходных операций внутри выбранного месяца."
            className="-mt-1"
            ariaLabel="Подробнее о динамике расходов"
          />
        </div>

        <Select value={granularity} onValueChange={(value) => onGranularityChange(value as ExpenseGranularity)}>
          <SelectTrigger className="h-12 min-w-[144px] rounded-2xl border-[var(--ft-border-default)] bg-transparent px-4 text-base">
            <SelectValue placeholder="День" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-[var(--ft-border-default)] bg-popover">
            {granularityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="px-7 pb-7">
          <Skeleton className="h-[360px] rounded-2xl" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-4 px-7 pb-7 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={onRetry}>
            Повторить
          </Button>
        </div>
      )}

      {!loading && !error && isEmpty && (
        <div className="px-7 pb-7">
          <p className="rounded-2xl border border-[var(--ft-border-subtle)] px-5 py-10 text-center text-base text-[var(--ft-text-secondary)]">
            Нет данных за выбранный период
          </p>
        </div>
      )}

      {!loading && !error && !isEmpty && (
        <div className="px-5 pb-6 sm:px-6">
          <div role="img" aria-label="Столбчатая диаграмма расходов">
            <ResponsiveContainer width="100%" height={376}>
              <BarChart data={chartData} margin={{ top: 26, right: 12, left: 10, bottom: 10 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="color-mix(in srgb, var(--ft-border-subtle) 92%, transparent)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 13, fill: 'var(--ft-text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                  angle={-36}
                  textAnchor="end"
                  height={76}
                />
                <YAxis
                  domain={yMax != null ? [0, yMax] : ['auto', 'auto']}
                  tickFormatter={(value: number) => formatYTick(value, currency)}
                  tick={{ fontSize: 13, fill: 'var(--ft-text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                  width={78}
                />
                <Tooltip
                  content={(props) => (
                    <BarsTooltip
                      active={props.active}
                      payload={props.payload as Array<{ payload: { label: string; amount: number } }>}
                      currency={currency}
                    />
                  )}
                  cursor={{ fill: 'color-mix(in srgb, var(--ft-primary-400) 10%, transparent)' }}
                />
                {average > 0 && (
                  <ReferenceLine
                    y={average}
                    stroke="var(--ft-text-secondary)"
                    strokeDasharray="6 4"
                    strokeWidth={1}
                  />
                )}
                <Bar
                  dataKey="barAmount"
                  fill="var(--ft-chart-expense)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex items-center gap-3 px-2 text-sm text-foreground">
            <span
              className="inline-block h-px w-9 border-t border-dashed"
              style={{ borderColor: 'var(--ft-text-secondary)' }}
            />
            <span className="text-[var(--ft-text-secondary)]">{getAverageLabel(granularity)}</span>
            <span className="font-semibold tabular-nums">{formatAnalyticsMetaMoney(average, currency)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
