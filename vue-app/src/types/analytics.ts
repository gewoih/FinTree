export type HealthStatus = 'good' | 'average' | 'poor';

export interface CategoryLegendItem {
  id: string;
  name: string;
  color: string;
  amount: number;
  mandatoryAmount: number;
  discretionaryAmount: number;
  percent: number;
  isMandatory?: boolean;
}

export type ExpenseGranularity = 'days' | 'weeks' | 'months';
export type CategoryScope = 'all' | 'mandatory' | 'discretionary';
export type CategoryDatasetMode = 'expenses' | 'incomes';

export interface ForecastSummary {
  forecastTotal: number | null;
  optimisticTotal: number | null;
  riskTotal: number | null;
  currentSpent: number | null;
  baselineLimit: number | null;
  status: HealthStatus | null;
}
