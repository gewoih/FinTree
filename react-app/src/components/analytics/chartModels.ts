import type { CategoryBreakdownDto, CategoryBreakdownItemDto, MonthlyExpenseDto } from '@/types';

import {
  getAnalyticsCategoryColorByIndex,
  getAnalyticsOtherCategoryColor,
} from './chartPalette';

export type CategoryScope = 'all' | 'mandatory' | 'discretionary';
export type ExpenseGranularity = 'days' | 'weeks' | 'months';

export interface AnalyticsCategorySlice extends CategoryBreakdownItemDto {
  displayAmount: number;
  displayPercent: number;
  displayColor: string;
}

export interface AnalyticsCategoryLegendItem extends AnalyticsCategorySlice {
  isOther?: boolean;
  children?: AnalyticsCategorySlice[];
}

export interface AnalyticsCategoryModel {
  chartData: AnalyticsCategorySlice[];
  legendItems: AnalyticsCategoryLegendItem[];
  total: number;
}

export interface SpendingBarDatum {
  label: string;
  rawAmount: number;
  displayAmount: number;
  isCapped: boolean;
}

export interface SpendingBarsModel {
  average: number;
  cap: number | null;
  hasOutliers: boolean;
  data: SpendingBarDatum[];
}

const SHORT_MONTH_FMT = new Intl.DateTimeFormat('ru-RU', { month: 'short' });
const OTHER_CATEGORY_ID = '__other__';
const OTHER_CATEGORY_THRESHOLD_PERCENT = 3;

function getDisplayAmount(item: CategoryBreakdownItemDto, scope: CategoryScope): number {
  if (scope === 'mandatory') {
    return item.mandatoryAmount;
  }

  if (scope === 'discretionary') {
    return item.discretionaryAmount;
  }

  return item.amount;
}

export function buildAnalyticsCategorySlices(
  data: CategoryBreakdownDto | null,
  scope: CategoryScope,
): AnalyticsCategorySlice[] {
  return buildAnalyticsCategoryModel(data, scope).chartData;
}

export function buildAnalyticsCategoryModel(
  data: CategoryBreakdownDto | null,
  scope: CategoryScope,
): AnalyticsCategoryModel {
  const items = data?.items ?? [];
  const scopedItems = items
    .map((item) => ({
      ...item,
      displayAmount: getDisplayAmount(item, scope),
    }))
    .filter((item) => item.displayAmount > 0)
    .sort((left, right) => right.displayAmount - left.displayAmount);

  const total = scopedItems.reduce((sum, item) => sum + item.displayAmount, 0);

  if (total <= 0) {
    return {
      chartData: [],
      legendItems: [],
      total: 0,
    };
  }

  const itemsWithPercent = scopedItems.map((item, index) => ({
    ...item,
    displayPercent: (item.displayAmount / total) * 100,
    displayColor: getAnalyticsCategoryColorByIndex(index),
  }));

  const mainItems = itemsWithPercent.filter(
    (item) => item.displayPercent >= OTHER_CATEGORY_THRESHOLD_PERCENT,
  );
  const otherItems = itemsWithPercent.filter(
    (item) => item.displayPercent < OTHER_CATEGORY_THRESHOLD_PERCENT,
  );

  if (otherItems.length === 0) {
    return {
      chartData: itemsWithPercent,
      legendItems: itemsWithPercent,
      total,
    };
  }

  const otherAmount = otherItems.reduce((sum, item) => sum + item.displayAmount, 0);
  const otherEntry: AnalyticsCategoryLegendItem = {
    id: OTHER_CATEGORY_ID,
    name: 'Прочее',
    color: getAnalyticsOtherCategoryColor(),
    amount: otherAmount,
    mandatoryAmount: otherItems.reduce((sum, item) => sum + item.mandatoryAmount, 0),
    discretionaryAmount: otherItems.reduce((sum, item) => sum + item.discretionaryAmount, 0),
    percent: (otherAmount / total) * 100,
    isMandatory: false,
    displayAmount: otherAmount,
    displayPercent: (otherAmount / total) * 100,
    displayColor: getAnalyticsOtherCategoryColor(),
    isOther: true,
    children: otherItems,
  };

  return {
    chartData: [...mainItems, otherEntry],
    legendItems: [...mainItems, otherEntry],
    total,
  };
}

export function calculateDonutStartAngle(items: readonly AnalyticsCategorySlice[]): number {
  if (items.length === 0) {
    return 90;
  }

  const total = items.reduce((sum, item) => sum + item.displayAmount, 0);
  if (total <= 0) {
    return 90;
  }

  const largestSlice = items[0];
  const arcDegrees = (largestSlice.displayAmount / total) * 360;

  return arcDegrees / 2;
}

function computeAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sorted: number[], percentileValue: number): number {
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.floor((percentileValue / 100) * (sorted.length - 1));
  return sorted[index] ?? 0;
}

function roundCap(rawValue: number): number {
  if (rawValue < 1_000) {
    return Math.ceil(rawValue / 100) * 100;
  }

  if (rawValue < 10_000) {
    return Math.ceil(rawValue / 1_000) * 1_000;
  }

  if (rawValue < 100_000) {
    return Math.ceil(rawValue / 5_000) * 5_000;
  }

  return Math.ceil(rawValue / 10_000) * 10_000;
}

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

function sortMonthlyExpenseItems(
  items: MonthlyExpenseDto[],
  granularity: ExpenseGranularity,
): MonthlyExpenseDto[] {
  return [...items].sort((left, right) => {
    if (granularity === 'weeks') {
      if (left.year !== right.year) {
        return left.year - right.year;
      }

      return (left.week ?? 0) - (right.week ?? 0);
    }

    if (left.year !== right.year) {
      return left.year - right.year;
    }

    if (left.month !== right.month) {
      return left.month - right.month;
    }

    if (granularity === 'days') {
      return (left.day ?? 0) - (right.day ?? 0);
    }

    return 0;
  });
}

export function buildSpendingBarsModel(
  items: MonthlyExpenseDto[],
  granularity: ExpenseGranularity,
): SpendingBarsModel {
  const orderedItems = sortMonthlyExpenseItems(items, granularity);
  const amounts = orderedItems.map((item) => item.amount).filter((amount) => amount > 0);
  const average = computeAverage(amounts);
  const maxValue = amounts.length > 0 ? Math.max(...amounts) : 0;
  const hasOutliers = average > 0 && maxValue > average * 3;

  let cap: number | null = null;
  if (hasOutliers) {
    const sorted = [...amounts].sort((left, right) => left - right);
    cap = roundCap(percentile(sorted, 85) * 1.2);
  }

  const data = orderedItems.map((item) => {
    const isCapped = cap !== null && item.amount > cap;
    return {
      label: buildXLabel(item, granularity),
      rawAmount: item.amount,
      displayAmount: isCapped ? (cap ?? item.amount) : item.amount,
      isCapped,
    };
  });

  return {
    average,
    cap,
    hasOutliers,
    data,
  };
}
