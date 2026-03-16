import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  LabelList,
} from 'recharts';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SpendingBreakdownDto, MonthlyExpenseDto } from '@/types';

import {
  AnalyticsPanel,
  AnalyticsSectionHeader,
  AnalyticsState,
} from './analyticsTheme';
import { buildSpendingBarsModel, type ExpenseGranularity } from './chartModels';
import { formatAnalyticsMetaMoney } from './models';

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
  payload?: ReadonlyArray<{ payload: { label: string; rawAmount: number } }>;
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
        {formatAnalyticsMetaMoney(entry.rawAmount, currency)}
      </p>
    </div>
  );
}

function CappedBarShape(props: {
  fill?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: {
    isCapped: boolean;
  };
}) {
  const { fill = 'var(--ft-chart-expense)', x = 0, y = 0, width = 0, height = 0, payload } = props;
  const isCapped = payload?.isCapped ?? false;

  if (height <= 0 || width <= 0) {
    return null;
  }

  if (!isCapped) {
    return <rect x={x} y={y} width={width} height={height} rx={6} fill={fill} />;
  }

  const visibleTop = y + 8;
  const zigTop = y + 1.5;
  const teeth = 4;
  const toothWidth = width / teeth;
  const zigPoints = Array.from({ length: teeth }, (_, index) => {
    const startX = x + toothWidth * index;
    const midX = startX + toothWidth / 2;
    const endX = startX + toothWidth;
    return `L${midX},${zigTop + 6} L${endX},${zigTop}`;
  });

  return (
    <g>
      <rect x={x} y={visibleTop} width={width} height={height - (visibleTop - y)} rx={6} fill={fill} />
      <path
        d={`M${x},${zigTop} ${zigPoints.join(' ')}`}
        fill="none"
        stroke="var(--ft-analytics-surface)"
        strokeWidth={2.5}
        strokeLinejoin="miter"
      />
    </g>
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
  const barsModel = buildSpendingBarsModel(rawItems, granularity);
  const { average, cap, data: chartData } = barsModel;

  const isEmpty = !loading && !error && rawItems.length === 0;

  return (
    <AnalyticsPanel>
      <AnalyticsSectionHeader
        title="Динамика расходов"
        tooltip="Показывает динамику расходных операций внутри выбранного месяца."
        ariaLabel="Подробнее о динамике расходов"
        actions={(
          <Select value={granularity} onValueChange={(value) => onGranularityChange(value as ExpenseGranularity)}>
            <SelectTrigger className="h-11 min-w-[144px] rounded-md border-[var(--ft-border-default)] bg-transparent px-4 text-sm">
              <SelectValue placeholder="День" />
            </SelectTrigger>
            <SelectContent className="rounded-md border-[var(--ft-border-default)] bg-popover">
              {granularityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      {loading && (
        <div className="px-7 pb-7">
          <Skeleton className="h-[360px] rounded-lg" />
        </div>
      )}

      {!loading && error && <AnalyticsState title="Не удалось загрузить динамику расходов" description={error} onRetry={onRetry} />}

      {!loading && !error && isEmpty && (
        <div className="px-7 pb-7">
          <p className="rounded-lg border border-[var(--ft-border-subtle)] px-5 py-10 text-center text-base text-[var(--ft-text-secondary)]">
            Нет данных за выбранный период
          </p>
        </div>
      )}

      {!loading && !error && !isEmpty && (
        <div className="px-5 pb-6 sm:px-6">
          <div role="img" aria-label="Столбчатая диаграмма расходов">
            <ResponsiveContainer width="100%" height={376}>
              <BarChart data={chartData} margin={{ top: 42, right: 12, left: 10, bottom: 10 }}>
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
                  domain={cap !== null ? [0, cap] : ['auto', 'auto']}
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
                      payload={
                        props.payload as unknown as ReadonlyArray<{
                          payload: { label: string; rawAmount: number };
                        }>
                      }
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
                  dataKey="displayAmount"
                  fill="var(--ft-chart-expense)"
                  maxBarSize={28}
                  shape={<CappedBarShape />}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="rawAmount"
                    content={(props) => {
                      const { x = 0, y = 0, width = 0, value, payload } = props as {
                        x?: number;
                        y?: number;
                        width?: number;
                        value?: number;
                        payload?: { isCapped?: boolean };
                      };

                      if (!payload?.isCapped || value === undefined) {
                        return null;
                      }

                      const label = formatAnalyticsMetaMoney(value, currency);
                      const pillWidth = Math.max(68, label.length * 7.25 + 16);

                      return (
                        <g>
                          <rect
                            x={x + width / 2 - pillWidth / 2}
                            y={Math.max(6, y - 30)}
                            width={pillWidth}
                            height={20}
                            rx={4}
                            style={{ fill: 'var(--ft-surface-overlay)' }}
                          />
                          <text
                            x={x + width / 2}
                            y={Math.max(6, y - 30) + 13}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="700"
                            style={{
                              fill: 'var(--ft-text-primary)',
                              fontFamily: 'Golos Text, sans-serif',
                            }}
                          >
                            {label}
                          </text>
                        </g>
                      );
                    }}
                  />
                </Bar>
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
    </AnalyticsPanel>
  );
}
