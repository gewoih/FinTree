import type { GoalSimulationParametersDto } from '@/types';

export interface GoalParameterOverrides {
  initialCapital?: number | null;
  monthlyIncome?: number | null;
  monthlyExpenses?: number | null;
  annualReturnRate?: number | null;
}

export interface GoalParameterField {
  key: keyof GoalParameterOverrides;
  label: string;
  hint?: string;
  isPercent?: boolean;
  min: number;
  max: number;
  step?: number;
}

export interface GoalChartPoint {
  label: string;
  tooltipLabel: string;
  p25: number;
  p50: number;
  p75: number;
  target: number;
}

export interface GoalDataQualityModel {
  tone: 'high' | 'medium' | 'low';
  label: string;
  description: string;
  scorePercent: number;
}

export interface GoalSimulationViewState {
  targetAmount: number | null;
  overrides: GoalParameterOverrides;
  resolvedParams: GoalSimulationParametersDto | null;
  hasPendingChanges: boolean;
  canRunSimulation: boolean;
}
