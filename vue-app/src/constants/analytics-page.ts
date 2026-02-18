import type { AnalyticsReadinessDto } from '../types'
import type { CategoryScope, ExpenseGranularity } from '../types/analytics'

export const GRANULARITY_OPTIONS: Array<{ label: string; value: ExpenseGranularity }> = [
  { label: 'День', value: 'days' },
  { label: 'Неделя', value: 'weeks' },
  { label: 'Месяц', value: 'months' }
]

export const CATEGORY_SCOPE_OPTIONS: Array<{ label: string; value: CategoryScope }> = [
  { label: 'Все', value: 'all' },
  { label: 'Обязательные', value: 'mandatory' },
  { label: 'Необязательные', value: 'discretionary' }
]

export const DEFAULT_ANALYTICS_READINESS: AnalyticsReadinessDto = {
  hasForecastAndStabilityData: false,
  observedExpenseDays: 0,
  requiredExpenseDays: 7
}
