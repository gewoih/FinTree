import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
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
import type { CategoryBreakdownDto, CategoryBreakdownItemDto } from '@/types';

import { InfoTooltip } from './InfoTooltip';
import {
  formatAnalyticsHeroMoney,
  formatAnalyticsMetaMoney,
  formatAnalyticsPercent,
} from './models';

type CategoryDatasetMode = 'expenses' | 'income';
type CategoryScope = 'all' | 'mandatory' | 'discretionary';

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

function getDisplayAmount(item: CategoryBreakdownItemDto, scope: CategoryScope): number {
  if (scope === 'mandatory') return item.mandatoryAmount;
  if (scope === 'discretionary') return item.discretionaryAmount;
  return item.amount;
}

function getDisplayTitle(mode: CategoryDatasetMode): string {
  return mode === 'income' ? 'Доходы по категориям' : 'Расходы по категориям';
}

function ChartTooltip({
  active,
  payload,
  currency,
}: TooltipProps<number, string> & { currency: string }) {
  const entry = payload?.[0]?.payload as
    | (CategoryBreakdownItemDto & { displayAmount: number })
    | undefined;

  if (!active || !entry) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="inline-block size-2.5 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="font-semibold text-foreground">{entry.name}</span>
      </div>
      <p className="mt-2 tabular-nums text-foreground">
        {formatAnalyticsMetaMoney(entry.displayAmount, currency)}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatAnalyticsPercent(entry.percent)}
      </p>
    </div>
  );
}

function ModeToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-2xl border border-[var(--ft-border-subtle)] bg-[color-mix(in_srgb,var(--ft-bg-base)_32%,transparent)] p-1">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="ghost"
          onClick={() => onChange(option.value)}
          className={
            option.value === value
              ? 'rounded-xl bg-card text-foreground shadow-[var(--ft-shadow-xs)]'
              : 'rounded-xl text-[var(--ft-text-tertiary)] hover:text-foreground'
          }
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function LegendRow({
  item,
  currency,
  isActive,
  onHover,
  onClick,
}: {
  item: CategoryBreakdownItemDto & { displayAmount: number };
  currency: string;
  isActive: boolean;
  onHover: (id: string | null) => void;
  onClick: (item: CategoryBreakdownItemDto) => void;
}) {
  return (
    <button
      type="button"
      className="grid min-h-[64px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--ft-primary-400)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ opacity: isActive ? 1 : 0.45 }}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(item)}
    >
      <span
        className="inline-block size-4 rounded-full"
        style={{ backgroundColor: item.color }}
        aria-hidden="true"
      />

      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
        <p className="truncate text-sm font-semibold tabular-nums text-[var(--ft-text-secondary)]">
          {formatAnalyticsMetaMoney(item.displayAmount, currency)}
        </p>
      </div>

      <p className="text-right text-base font-semibold tabular-nums text-foreground">
        {formatAnalyticsPercent(item.percent)}
      </p>
    </button>
  );
}

function PieSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 px-7 pb-7 pt-3 lg:grid-cols-[minmax(280px,1fr)_minmax(280px,0.9fr)]">
      <div className="flex items-center justify-center">
        <Skeleton className="size-[320px] rounded-full" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} className="h-[72px] rounded-2xl" />
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

  const chartData = useMemo(
    () =>
      (data?.items ?? [])
        .map((item) => ({
          ...item,
          displayAmount: getDisplayAmount(item, scope),
        }))
        .filter((item) => item.displayAmount > 0)
        .sort((left, right) => right.displayAmount - left.displayAmount),
    [data?.items, scope],
  );

  const total = chartData.reduce((sum, item) => sum + item.displayAmount, 0);
  const isEmpty = !loading && !error && total === 0;

  return (
    <Card
      className="gap-0 rounded-[28px] border border-[var(--ft-border-default)] shadow-[var(--ft-shadow-lg)]"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-raised) 84%, var(--ft-bg-base)) 0%, var(--ft-surface-base) 100%)',
      }}
    >
      <div className="flex flex-col gap-5 px-6 py-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(16rem,1fr)_auto] xl:items-start">
          <div className="flex min-w-0 items-start gap-2">
            <h2 className="max-w-[11ch] text-[1.75rem] font-semibold leading-tight text-foreground">
              {getDisplayTitle(mode)}
            </h2>
            <InfoTooltip
              content="Показывает распределение операций по категориям за выбранный месяц."
              className="-mt-1"
              ariaLabel="Подробнее о распределении по категориям"
            />
          </div>

          <div className="flex flex-wrap gap-3 xl:justify-end">
            <ModeToggle options={modeOptions} value={mode} onChange={onModeChange} />

            {mode === 'expenses' && (
              <Select value={scope} onValueChange={(value) => onScopeChange(value as CategoryScope)}>
                <SelectTrigger className="h-12 min-w-[156px] rounded-2xl border-[var(--ft-border-default)] bg-transparent px-4 text-base">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-[var(--ft-border-default)] bg-popover">
                  {scopeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {loading && <PieSkeleton />}

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
        <div className="grid grid-cols-1 gap-7 px-6 pb-6 pt-1 lg:grid-cols-[minmax(320px,1.05fr)_minmax(280px,0.95fr)]">
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
                  innerRadius="70%"
                  outerRadius="88%"
                  paddingAngle={1.2}
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={entry.color}
                      opacity={activeId === null || activeId === entry.id ? 1 : 0.32}
                    />
                  ))}
                </Pie>
                <Tooltip content={(props) => <ChartTooltip {...props} currency={currency} />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--ft-text-tertiary)]">
                  Всего
                </span>
                <span
                  className="text-[clamp(1.85rem,3.2vw,2.45rem)] font-bold leading-none text-foreground"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatAnalyticsHeroMoney(total, currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--ft-border-subtle)] bg-[color-mix(in_srgb,var(--ft-surface-base)_82%,transparent)] p-2.5">
            <div className="max-h-[372px] space-y-1 overflow-y-auto pr-1">
              {chartData.map((item) => (
                <LegendRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  isActive={activeId === null || activeId === item.id}
                  onHover={setActiveId}
                  onClick={onCategorySelect}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
