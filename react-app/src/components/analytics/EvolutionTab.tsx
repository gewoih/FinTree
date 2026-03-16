import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import * as analyticsApi from '@/api/analytics';
import { queryKeys } from '@/api/queryKeys';
import {
  AnalyticsInset,
  AnalyticsPanel,
  AnalyticsSectionHeader,
  AnalyticsSegmentedControl,
  AnalyticsState,
} from './analyticsTheme';
import { analyticsHeroStyle } from './analyticsTokens';
import {
  buildEvolutionViewModel,
  EVOLUTION_KPI_META,
  EVOLUTION_KPI_ORDER,
  type EvolutionDeltaTone,
  type EvolutionKpi,
  type EvolutionKpiCardModel,
  type EvolutionRange,
  type EvolutionTableCellModel,
} from './evolutionModels';

interface EvolutionTabProps {
  isActive: boolean;
}

const RANGE_OPTIONS: Array<{ label: string; value: EvolutionRange }> = [
  { label: '6 мес', value: 6 },
  { label: '12 мес', value: 12 },
  { label: 'Всё', value: 0 },
];

function resolveKpiColor(kpi: EvolutionKpi): string {
  switch (kpi) {
    case 'totalMonthScore':
      return 'var(--ft-chart-1)';
    case 'savingsRate':
      return 'var(--ft-chart-category-4)';
    case 'stabilityScore':
      return 'var(--ft-chart-category-2)';
    case 'discretionaryPercent':
      return 'var(--ft-chart-category-3)';
    case 'liquidMonths':
      return 'var(--ft-chart-category-5)';
    case 'peakDayRatio':
      return 'var(--ft-chart-category-8)';
    default:
      return 'var(--ft-chart-1)';
  }
}

function deltaToneClassName(deltaTone: EvolutionDeltaTone | null): string {
  if (deltaTone === 'better') {
    return 'text-[var(--ft-success-400)]';
  }

  if (deltaTone === 'worse') {
    return 'text-[var(--ft-danger-400)]';
  }

  return 'text-[var(--ft-text-secondary)]';
}

function trendLabel(trend: EvolutionKpiCardModel['trendVerdict']): string | null {
  if (trend === 'growing') {
    return 'Растёт';
  }

  if (trend === 'declining') {
    return 'Снижается';
  }

  if (trend === 'stable') {
    return 'Стабильно';
  }

  return null;
}

function EvolutionTooltip({
  active,
  payload,
  label,
  model,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: number | string | ReadonlyArray<number | string> | null;
  }>;
  label?: string | number;
  model: EvolutionKpiCardModel;
}) {
  const rawValue = payload?.[0]?.value;
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  if (!active || value === null || value === undefined || typeof value !== 'number') {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-[var(--ft-text-secondary)]">{label}</p>
      <p className="font-semibold text-foreground">{model.label}</p>
      <p className="mt-1 font-semibold tabular-nums text-foreground">
        {value.toLocaleString('ru-RU', {
          maximumFractionDigits: EVOLUTION_KPI_META[model.key].precision,
        })}
        {EVOLUTION_KPI_META[model.key].valueKind === 'score'
          ? '/100'
          : EVOLUTION_KPI_META[model.key].valueKind === 'ratio' || EVOLUTION_KPI_META[model.key].valueKind === 'percent'
            ? '%'
            : EVOLUTION_KPI_META[model.key].valueKind === 'months'
              ? ' мес.'
              : ''}
      </p>
    </div>
  );
}

function EvolutionSparkline({
  model,
  hero = false,
}: {
  model: EvolutionKpiCardModel;
  hero?: boolean;
}) {
  const color = resolveKpiColor(model.key);
  const data = model.labels.map((label, index) => ({
    label,
    value: model.values[index] ?? null,
  })).filter((item) => item.value !== null);

  if (data.length === 0) {
    return null;
  }

  return (
    <div
      className={hero ? 'h-[220px] w-full' : 'h-[120px] w-full'}
      role="img"
      aria-label={`График показателя ${model.label}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke="color-mix(in srgb, var(--ft-border-subtle) 92%, transparent)"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--ft-text-secondary)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip content={(props) => <EvolutionTooltip {...props} model={model} />} />
          {hero && (
            <Area
              type="monotone"
              dataKey="value"
              fill="color-mix(in srgb, var(--ft-chart-1) 16%, transparent)"
              stroke="none"
              isAnimationActive={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={hero ? 2.5 : 2}
            dot={hero ? { r: 3, fill: color, stroke: 'var(--ft-analytics-surface)', strokeWidth: 2 } : false}
            activeDot={{ r: 4, fill: color, stroke: 'var(--ft-analytics-surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function EvolutionMetricCard({
  model,
  hero = false,
}: {
  model: EvolutionKpiCardModel;
  hero?: boolean;
}) {
  const color = resolveKpiColor(model.key);
  const trend = trendLabel(model.trendVerdict);

  return (
    <AnalyticsInset className={hero ? 'p-5 sm:p-6' : 'flex h-full flex-col gap-4 p-5'}>
      <div className={hero ? 'grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]' : 'space-y-4'}>
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{model.label}</span>
              <span className="text-xs text-[var(--ft-text-secondary)]">{model.directionHint}</span>
            </div>
            <p className="text-sm leading-6 text-[var(--ft-text-secondary)]">{model.description}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--ft-text-tertiary)]">
              {model.currentMonthLabel ?? 'Последний месяц'}
            </p>
            <p
              className="text-foreground"
              style={{
                ...analyticsHeroStyle,
                fontSize: hero ? 'var(--ft-text-4xl)' : 'var(--ft-text-3xl)',
                color,
              }}
            >
              {model.currentValueLabel ?? '—'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {model.deltaLabel && (
              <span className={deltaToneClassName(model.deltaTone)}>
                {model.deltaLabel}
              </span>
            )}
            {trend && (
              <span className="text-[var(--ft-text-secondary)]">{trend}</span>
            )}
            {model.statusLabel && (
              <span className="text-[var(--ft-text-secondary)]">{model.statusLabel}</span>
            )}
          </div>

          {model.actionLabel && (
            <p className="text-sm leading-6 text-[var(--ft-text-secondary)]">{model.actionLabel}</p>
          )}
        </div>

        <EvolutionSparkline model={model} hero={hero} />
      </div>
    </AnalyticsInset>
  );
}

function EvolutionLoadingState() {
  return (
    <AnalyticsPanel>
      <div className="space-y-4 px-6 py-6">
        <Skeleton className="h-[280px] rounded-lg" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {['a', 'b', 'c', 'd', 'e'].map((key) => (
            <Skeleton key={key} className="h-[220px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[360px] rounded-lg" />
      </div>
    </AnalyticsPanel>
  );
}

function EvolutionDetailedTable({
  rows,
  selectedRange,
}: {
  rows: Array<{ key: string; monthLabel: string; cells: EvolutionTableCellModel[] }>;
  selectedRange: EvolutionRange;
}) {
  const [showAllMonths, setShowAllMonths] = useState(false);
  const months = selectedRange === 0 && !showAllMonths ? rows.slice(0, 12) : rows;

  const tableRows = EVOLUTION_KPI_ORDER.map((kpi) => ({
    key: kpi,
    label: EVOLUTION_KPI_META[kpi].label,
    cells: months.map((month) => month.cells.find((cell) => cell.key === kpi) ?? null),
  }));

  return (
    <AnalyticsInset className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground">Детальная таблица по месяцам</h3>
          {selectedRange === 0 && rows.length > 12 && !showAllMonths && (
            <button
              type="button"
              className="min-h-[44px] rounded-md px-3 text-sm font-medium text-[var(--ft-primary-400)]"
              onClick={() => setShowAllMonths(true)}
            >
              Показать все ({rows.length - months.length})
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--ft-border-subtle)]">
          <table className="min-w-[880px] w-full">
            <thead>
              <tr className="border-b border-[var(--ft-border-subtle)] bg-[var(--ft-analytics-surface-subtle)]">
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--ft-text-secondary)]">
                  Показатель
                </th>
                {months.map((month) => (
                  <th
                    key={month.key}
                    className="px-4 py-3 text-left text-sm font-semibold text-[var(--ft-text-secondary)]"
                  >
                    {month.monthLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.key} className="border-b border-[var(--ft-border-subtle)] last:border-b-0">
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                    {row.label}
                  </th>
                  {row.cells.map((cell, index) => (
                    <td key={`${row.key}-${months[index]?.key ?? index}`} className="px-4 py-3 align-top">
                      <div className="text-sm font-semibold tabular-nums text-foreground">
                        {cell?.valueLabel ?? '—'}
                      </div>
                      {cell?.deltaLabel && (
                        <div className={deltaToneClassName(cell.deltaTone)}>
                          <span className="text-xs font-medium tabular-nums">{cell.deltaLabel}</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AnalyticsInset>
  );
}

export function EvolutionTab({ isActive }: EvolutionTabProps) {
  const [selectedRange, setSelectedRange] = useState<EvolutionRange>(6);

  const evolutionQuery = useQuery({
    queryKey: queryKeys.analytics.evolution(selectedRange),
    queryFn: () => analyticsApi.getEvolution(selectedRange),
    staleTime: 60_000,
    enabled: isActive,
  });

  const months = evolutionQuery.data ?? [];
  const withData = months.filter((month) => month.hasData);
  const viewModel = useMemo(() => buildEvolutionViewModel(withData), [withData]);

  if (evolutionQuery.isLoading) {
    return <EvolutionLoadingState />;
  }

  if (evolutionQuery.error) {
    const errorMessage = evolutionQuery.error instanceof Error ? evolutionQuery.error.message : 'Ошибка загрузки';
    return (
      <AnalyticsPanel>
        <AnalyticsSectionHeader title="Динамика" />
        <AnalyticsState title="Не удалось загрузить динамику" description={errorMessage} onRetry={() => evolutionQuery.refetch()} />
      </AnalyticsPanel>
    );
  }

  if (withData.length === 0) {
    return (
      <AnalyticsPanel>
        <AnalyticsSectionHeader
          title="Динамика"
          actions={
            <AnalyticsSegmentedControl
              options={RANGE_OPTIONS}
              value={selectedRange}
              onChange={setSelectedRange}
            />
          }
        />
        <AnalyticsState title="Нет данных за выбранный период" description="Добавьте операции, чтобы построить динамику." />
      </AnalyticsPanel>
    );
  }

  return (
    <AnalyticsPanel>
      <AnalyticsSectionHeader
        title="Динамика"
        actions={
          <AnalyticsSegmentedControl
            options={RANGE_OPTIONS}
            value={selectedRange}
            onChange={setSelectedRange}
          />
        }
      />

      <div className="space-y-6 px-6 pb-6">
        <EvolutionMetricCard model={viewModel.heroCard} hero />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {viewModel.kpiCards.map((card) => (
            <EvolutionMetricCard key={card.key} model={card} />
          ))}
        </div>

        <EvolutionDetailedTable rows={viewModel.tableRows} selectedRange={selectedRange} />
      </div>
    </AnalyticsPanel>
  );
}
