import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/format';
import type { SpendingBreakdownDto, MonthlyExpenseDto } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SHORT_MONTH_FMT = new Intl.DateTimeFormat('ru-RU', { month: 'short' });

function buildXLabel(entry: MonthlyExpenseDto, granularity: ExpenseGranularity): string {
  if (granularity === 'days') {
    return String(entry.day ?? '');
  }
  if (granularity === 'weeks') {
    return `Нед ${entry.week ?? ''}`;
  }
  // months
  const date = new Date(entry.year, entry.month - 1, 1);
  return SHORT_MONTH_FMT.format(date);
}

function computeAverage(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

// ─── Formatted tick for Y axis ────────────────────────────────────────────────

function formatYTick(value: number, currency: string): string {
  if (value === 0) return '0';
  if (value >= 1_000_000) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      notation: 'compact',
    }).format(value);
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface BarPayload {
  label: string;
  amount: number;
  isOutlier: boolean;
}

interface BarsTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BarPayload }>;
  currency: string;
}

function BarsTooltip({ active, payload, currency }: BarsTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;

  return (
    <div className="rounded-lg bg-card px-3 py-2 text-sm shadow-lg ring-1 ring-foreground/10">
      <p className="text-muted-foreground">{entry.label}</p>
      <p className="font-semibold tabular-nums text-foreground">
        {formatCurrency(entry.amount, currency)}
      </p>
    </div>
  );
}

// ─── Outlier top label ────────────────────────────────────────────────────────

interface OutlierLabelProps {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
  currency: string;
  isOutlier: boolean;
}

function OutlierLabel({ x = 0, y = 0, width = 0, value, currency, isOutlier }: OutlierLabelProps) {
  if (!isOutlier || value == null) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 4}
      fill="var(--color-foreground)"
      fontSize={10}
      textAnchor="middle"
      opacity={0.7}
    >
      {formatCurrency(value, currency)}
    </text>
  );
}

// ─── Toggle Group ─────────────────────────────────────────────────────────────

interface ToggleGroupProps<T extends string> {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (v: T) => void;
}

function ToggleGroup<T extends string>({ options, value, onChange }: ToggleGroupProps<T>) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          variant={opt.value === value ? 'default' : 'ghost'}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
  const amounts = rawItems.map((it) => it.amount);
  const average = computeAverage(amounts);

  const sorted = [...amounts].sort((a, b) => a - b);
  const p85 = percentile(sorted, 85);
  const hasOutliers = amounts.length > 0 && Math.max(...amounts) > average * 3;
  const yMax = hasOutliers ? p85 * 1.2 : undefined;

  const chartData = rawItems.map((it) => ({
    label: buildXLabel(it, granularity),
    amount: it.amount,
    isOutlier: hasOutliers && it.amount > (yMax ?? Infinity),
    // clamp bar to domain max when outlier
    barAmount: hasOutliers && yMax != null && it.amount > yMax ? yMax : it.amount,
  }));

  const isEmpty = !loading && !error && rawItems.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Расходы по периодам</CardTitle>
        <CardAction>
          <ToggleGroup
            options={granularityOptions}
            value={granularity}
            onChange={onGranularityChange}
          />
        </CardAction>
      </CardHeader>

      {loading && (
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-md" />
        </CardContent>
      )}

      {!loading && error && (
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Повторить
          </Button>
        </CardContent>
      )}

      {!loading && !error && isEmpty && (
        <CardContent className="flex items-center justify-center py-12 text-center">
          <p className="max-w-[240px] text-sm text-muted-foreground">
            Нет данных за выбранный период
          </p>
        </CardContent>
      )}

      {!loading && !error && !isEmpty && (
        <CardContent>
          <div
            role="img"
            aria-label={`Столбчатая диаграмма расходов по ${granularity === 'days' ? 'дням' : granularity === 'weeks' ? 'неделям' : 'месяцам'}`}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="30%"
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={yMax != null ? [0, yMax] : ['auto', 'auto']}
                  tickFormatter={(v: number) => formatYTick(v, currency)}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <Tooltip
                  content={(props) => (
                    <BarsTooltip
                      active={props.active}
                      payload={props.payload as unknown as BarsTooltipProps['payload']}
                      currency={currency}
                    />
                  )}
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                />
                {average > 0 && (
                  <ReferenceLine
                    y={average}
                    stroke="var(--color-muted-foreground)"
                    strokeDasharray="4 2"
                    strokeWidth={1}
                  />
                )}
                <Bar dataKey="barAmount" fill="var(--color-primary)" radius={[3, 3, 0, 0]}>
                  <LabelList
                    dataKey="amount"
                    position="top"
                    content={(props) => (
                      <OutlierLabel
                        {...(props as OutlierLabelProps)}
                        currency={currency}
                        isOutlier={
                          chartData.find((d) => d.amount === props.value)?.isOutlier ?? false
                        }
                      />
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
