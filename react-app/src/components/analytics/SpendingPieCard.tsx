import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CategoryBreakdownDto, CategoryBreakdownItemDto } from '@/types';

import {
  AnalyticsInset,
  AnalyticsPanel,
  AnalyticsSectionHeader,
  AnalyticsSegmentedControl,
  AnalyticsState,
} from './analyticsTheme';
import { analyticsHeroStyle } from './analyticsTokens';
import {
  buildAnalyticsCategoryModel,
  calculateDonutStartAngle,
  type AnalyticsCategoryLegendItem,
  type AnalyticsCategorySlice,
  type CategoryScope,
} from './chartModels';
import {
  formatAnalyticsHeroMoney,
  formatAnalyticsMetaMoney,
  formatAnalyticsPercent,
} from './models';

type CategoryDatasetMode = 'expenses' | 'income';

interface SpendingPieCardProps {
  loading: boolean;
  error: string | null;
  data: CategoryBreakdownDto | null;
  currency: string;
  mode: CategoryDatasetMode;
  modeOptions: Array<{ label: string; value: CategoryDatasetMode }>;
  scope: CategoryScope;
  scopeOptions: Array<{ label: string; value: CategoryScope }>;
  onModeChange: (mode: CategoryDatasetMode) => void;
  onScopeChange: (scope: CategoryScope) => void;
  onCategorySelect: (item: CategoryBreakdownItemDto) => void;
  onRetry: () => void;
}

function getDisplayTitle(mode: CategoryDatasetMode): string {
  return mode === 'income' ? 'Доходы по категориям' : 'Расходы по категориям';
}

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload: AnalyticsCategorySlice;
  }>;
  currency: string;
}) {
  const entry = payload?.[0]?.payload;

  if (!active || !entry) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="inline-block size-2.5 rounded-full"
          style={{ backgroundColor: entry.displayColor }}
        />
        <span className="font-semibold text-foreground">{entry.name}</span>
      </div>
      <p className="mt-2 tabular-nums text-foreground">
        {formatAnalyticsMetaMoney(entry.displayAmount, currency)}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatAnalyticsPercent(entry.displayPercent)}
      </p>
    </div>
  );
}

function LegendRow({
  item,
  currency,
  isActive,
  isOther = false,
  isChild = false,
  isExpanded = false,
  onHover,
  onClick,
  onToggleOther,
}: {
  item: AnalyticsCategorySlice;
  currency: string;
  isActive: boolean;
  onHover: (id: string | null) => void;
  onClick: (item: CategoryBreakdownItemDto) => void;
  isOther?: boolean;
  isChild?: boolean;
  isExpanded?: boolean;
  onToggleOther?: () => void;
}) {
  const handleClick = () => {
    if (isOther) {
      onToggleOther?.();
      return;
    }

    onClick(item);
  };

  return (
    <button
      type="button"
      className="grid min-h-[58px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--ft-primary-400)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ opacity: isActive ? 1 : 0.45 }}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      onClick={handleClick}
      aria-expanded={isOther ? isExpanded : undefined}
    >
      <span
        className="inline-block shrink-0 rounded-full"
        style={{
          width: isChild ? '10px' : '14px',
          height: isChild ? '10px' : '14px',
          backgroundColor: item.displayColor,
        }}
        aria-hidden="true"
      />

      <div className={`min-w-0 ${isChild ? 'pl-2' : ''}`}>
        <p className={`truncate font-semibold text-foreground ${isChild ? 'text-sm' : 'text-base'}`}>
          {item.name}
        </p>
        <p className={`truncate font-semibold tabular-nums text-[var(--ft-text-secondary)] ${isChild ? 'text-xs' : 'text-sm'}`}>
          {formatAnalyticsMetaMoney(item.displayAmount, currency)}
        </p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <p className={`text-right font-semibold tabular-nums text-foreground ${isChild ? 'text-sm' : 'text-base'}`}>
          {formatAnalyticsPercent(item.displayPercent)}
        </p>
        {isOther && (
          <ChevronDown
            className="size-4 text-[var(--ft-text-secondary)] transition-transform"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          />
        )}
      </div>
    </button>
  );
}

interface LegendRowModel {
  key: string;
  item: AnalyticsCategorySlice;
  isOther: boolean;
  isChild: boolean;
  sliceId: string;
}

function buildLegendRows(
  legendItems: AnalyticsCategoryLegendItem[],
  isOtherExpanded: boolean,
): LegendRowModel[] {
  const rows: LegendRowModel[] = [];

  legendItems.forEach((item) => {
    const isOther = item.isOther === true;

    rows.push({
      key: item.id,
      item,
      isOther,
      isChild: false,
      sliceId: item.id,
    });

    if (isOther && isOtherExpanded && item.children) {
      item.children.forEach((child) => {
        rows.push({
          key: child.id,
          item: child,
          isOther: false,
          isChild: true,
          sliceId: item.id,
        });
      });
    }
  });

  return rows;
}

function PieSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 px-6 pb-6 pt-2 lg:grid-cols-[minmax(280px,1fr)_minmax(280px,0.9fr)]">
      <div className="flex items-center justify-center">
        <Skeleton className="size-[320px] rounded-full" />
      </div>
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} className="h-[64px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function SpendingPieCard({
  loading,
  error,
  data,
  currency,
  mode,
  modeOptions,
  scope,
  scopeOptions,
  onModeChange,
  onScopeChange,
  onCategorySelect,
  onRetry,
}: SpendingPieCardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isOtherExpanded, setIsOtherExpanded] = useState(false);

  const chartModel = useMemo(
    () => buildAnalyticsCategoryModel(data, scope),
    [data, scope],
  );
  const { chartData, legendItems, total } = chartModel;
  const hasOtherEntry = legendItems.some((item) => item.isOther);
  const effectiveActiveId = chartData.some((item) => item.id === activeId) ? activeId : null;
  const legendRows = useMemo(
    () => buildLegendRows(legendItems, hasOtherEntry && isOtherExpanded),
    [legendItems, hasOtherEntry, isOtherExpanded],
  );

  const handleModeChange = (nextMode: CategoryDatasetMode) => {
    setActiveId(null);
    setIsOtherExpanded(false);
    onModeChange(nextMode);
  };

  const handleScopeChange = (nextScope: CategoryScope) => {
    setActiveId(null);
    setIsOtherExpanded(false);
    onScopeChange(nextScope);
  };

  const isEmpty = !loading && !error && total === 0;
  const startAngle = calculateDonutStartAngle(chartData);

  return (
    <AnalyticsPanel>
      <AnalyticsSectionHeader
        title={getDisplayTitle(mode)}
        tooltip="Показывает распределение операций по категориям за выбранный месяц."
        ariaLabel="Подробнее о распределении по категориям"
        actions={(
          <>
            <AnalyticsSegmentedControl options={modeOptions} value={mode} onChange={handleModeChange} />

            {mode === 'expenses' && (
              <Select value={scope} onValueChange={(value) => handleScopeChange(value as CategoryScope)}>
                <SelectTrigger className="h-11 min-w-[156px] rounded-md border-[var(--ft-border-default)] bg-transparent px-4 text-sm">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent className="rounded-md border-[var(--ft-border-default)] bg-popover">
                  {scopeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}
      />

      {loading && <PieSkeleton />}

      {!loading && error && <AnalyticsState title="Не удалось загрузить структуру категорий" description={error} onRetry={onRetry} />}

      {!loading && !error && isEmpty && (
        <div className="px-6 pb-6">
          <p className="rounded-lg border border-[var(--ft-border-subtle)] px-5 py-10 text-center text-base text-[var(--ft-text-secondary)]">
            Нет данных за выбранный период
          </p>
        </div>
      )}

      {!loading && !error && !isEmpty && (
        <div className="grid grid-cols-1 gap-5 px-5 pb-5 pt-1 lg:grid-cols-[minmax(320px,1.05fr)_minmax(280px,0.95fr)]">
          <div
            className="relative min-h-[372px]"
            role="img"
            aria-label="Кольцевая диаграмма распределения по категориям"
          >
            <ResponsiveContainer width="100%" height={372}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="displayAmount"
                  cx="50%"
                  cy="50%"
                  innerRadius="63%"
                  outerRadius="90%"
                  paddingAngle={1.2}
                  stroke="none"
                  startAngle={startAngle}
                  endAngle={startAngle - 360}
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={entry.displayColor}
                      opacity={effectiveActiveId === null || effectiveActiveId === entry.id ? 1 : 0.32}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => (
                    <ChartTooltip
                      active={props.active}
                      payload={
                        props.payload as unknown as ReadonlyArray<{
                          payload: AnalyticsCategorySlice;
                        }>
                      }
                      currency={currency}
                    />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className="text-foreground"
                style={{ ...analyticsHeroStyle, fontSize: 'var(--ft-text-3xl)' }}
              >
                {formatAnalyticsHeroMoney(total, currency)}
              </span>
            </div>
          </div>

          <AnalyticsInset className="p-2">
            <div className="max-h-[372px] space-y-1 overflow-y-auto pr-1">
              {legendRows.map((row) => (
                <LegendRow
                  key={row.key}
                  item={row.item}
                  currency={currency}
                  isActive={effectiveActiveId === null || effectiveActiveId === row.sliceId}
                  isOther={row.isOther}
                  isChild={row.isChild}
                  isExpanded={row.isOther && isOtherExpanded}
                  onHover={(id) => setActiveId(id === null ? null : row.sliceId)}
                  onClick={onCategorySelect}
                  onToggleOther={
                    row.isOther
                      ? () => setIsOtherExpanded((value) => !value)
                      : undefined
                  }
                />
              ))}
            </div>
          </AnalyticsInset>
        </div>
      )}
    </AnalyticsPanel>
  );
}
