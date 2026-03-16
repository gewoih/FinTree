import type { GoalSimulationParametersDto } from '@/types';
import { formatEditableNumber } from '@/utils/format';
import type { GoalParameterField, GoalParameterOverrides } from './goalModels';
import { resolveGoalParamValue } from './goalUtils';

export const GOAL_PARAMETER_FIELDS: GoalParameterField[] = [
  {
    key: 'initialCapital',
    label: 'Начальный капитал',
    min: 0,
    max: 1_000_000_000_000,
    step: 1_000,
  },
  {
    key: 'monthlyIncome',
    label: 'Ежемесячный доход',
    min: 0,
    max: 1_000_000_000,
    step: 1_000,
  },
  {
    key: 'monthlyExpenses',
    label: 'Ежемесячные расходы',
    min: 0,
    max: 1_000_000_000,
    step: 1_000,
  },
  {
    key: 'annualReturnRate',
    label: 'Доходность инвестиций',
    hint: '% годовых',
    isPercent: true,
    min: 0,
    max: 100,
    step: 0.1,
  },
];

export function getGoalParameterDisplayValue(
  field: GoalParameterField,
  overrides: GoalParameterOverrides,
  resolvedParams: GoalSimulationParametersDto
): string {
  const currentValue = overrides[field.key] ?? resolveGoalParamValue(resolvedParams, field.key);
  const displayValue = field.isPercent ? currentValue * 100 : currentValue;

  if (!Number.isFinite(displayValue)) {
    return '';
  }

  return formatEditableNumber(displayValue, field.isPercent ? 1 : 2);
}

export function setGoalOverrideValue(
  field: GoalParameterField,
  overrides: GoalParameterOverrides,
  rawValue: string
): GoalParameterOverrides {
  const normalizedValue = rawValue.trim();

  if (normalizedValue.length === 0) {
    return {
      ...overrides,
      [field.key]: null,
    };
  }

  const parsed = Number(normalizedValue);
  if (Number.isNaN(parsed)) {
    return overrides;
  }

  return {
    ...overrides,
    [field.key]: field.isPercent ? parsed / 100 : parsed,
  };
}
