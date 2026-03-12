import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
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
import { formatCurrency, formatPercent } from '@/utils/format';
import type { CategoryBreakdownDto, CategoryBreakdownItemDto } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayAmount(
  item: CategoryBreakdownItemDto,
  scope: CategoryScope
): number {
  if (scope === 'mandatory') return item.mandatoryAmount;
  if (scope === 'discretionary') return item.discretionaryAmount;
  return item.amount;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipEntry {
  payload?: CategoryBreakdownItemDto & { displayAmount: number };
}

function PieTooltip({ active, payload }: TooltipProps<number, string> & { payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as (CategoryBreakdownItemDto & { displayAmount: number }) | undefined;
  if (!entry) return null;

  return (
    <div className="rounded-lg bg-card px-3 py-2 text-sm shadow-lg ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <span
          className="inline-block size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="font-medium text-foreground">{entry.name}</span>
      </div>
    </div>
  );
}

// ─── Legend Row ───────────────────────────────────────────────────────────────

interface LegendRowProps {
  item: CategoryBreakdownItemDto;
  displayAmount: number;
  currency: string;
  isActive: boolean;
  onHover: (id: string | null) => void;
  onClick: (item: CategoryBreakdownItemDto) => void;
}

function LegendRow({ item, displayAmount, currency, isActive, onHover, onClick }: LegendRowProps) {
  return (
    <button
      type="button"
      key={item.id}
      className="flex w-full min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ opacity: isActive ? 1 : 0.6 }}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(item)}
    >
      <span
        className="inline-block size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: item.color }}
      />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {item.name}
      </span>
      <span className="ml-auto shrink-0 text-right text-sm tabular-nums text-foreground">
        {formatCurrency(displayAmount, currency)}
      </span>
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {item.percent != null ? formatPercent(item.percent) : '—'}
      </span>
    </button>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function PieSkeleton() {
  return (
    <CardContent className="flex flex-col items-center gap-4">
      <Skeleton className="size-[220px] rounded-full" />
      <div className="w-full space-y-2">
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-[44px] w-full rounded-md" />
        ))}
      </div>
    </CardContent>
  );
}

// ─── ToggleGroup helper ───────────────────────────────────────────────────────

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

  const items = data?.items ?? [];
  const chartData = items.map((item) => ({
    ...item,
    displayAmount: getDisplayAmount(item, scope),
  }));
  const total = chartData.reduce((sum, it) => sum + it.displayAmount, 0);

  const isEmpty = !loading && !error && total === 0;
  const emptyLabel =
    mode === 'income'
      ? 'Добавьте доходы, чтобы увидеть распределение по категориям'
      : 'Добавьте расходы, чтобы увидеть распределение по категориям';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Категории</CardTitle>
        <CardAction>
          <ToggleGroup options={modeOptions} value={mode} onChange={onModeChange} />
        </CardAction>
        {mode === 'expenses' && (
          <div className="col-span-2 mt-1">
            <ToggleGroup options={scopeOptions} value={scope} onChange={onScopeChange} />
          </div>
        )}
      </CardHeader>

      {loading && <PieSkeleton />}

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
          <p className="max-w-[240px] text-sm text-muted-foreground">{emptyLabel}</p>
        </CardContent>
      )}

      {!loading && !error && !isEmpty && (
        <CardContent className="flex flex-col gap-4">
          {/* Chart */}
          <div
            className="relative"
            role="img"
            aria-label={`Круговая диаграмма: распределение по категориям`}
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="displayAmount"
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="85%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={entry.color}
                      opacity={activeId === null || activeId === entry.id ? 1 : 0.35}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Donut center label */}
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-xs text-muted-foreground">Итого</span>
              <span className="text-base font-semibold tabular-nums text-foreground">
                {formatCurrency(total, currency)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col">
            {chartData.map((item) => (
              <LegendRow
                key={item.id}
                item={item}
                displayAmount={item.displayAmount}
                currency={currency}
                isActive={activeId === null || activeId === item.id}
                onHover={setActiveId}
                onClick={onCategorySelect}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
