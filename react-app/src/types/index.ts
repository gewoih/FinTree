// ━━━ ENUMS & UNION TYPES ━━━

/** 0 = Bank, 2 = Crypto, 3 = Brokerage, 4 = Deposit */
export type AccountType = 0 | 2 | 3 | 4;

/** Runtime array of all valid AccountType values — use instead of duplicating literals. */
export const ACCOUNT_TYPE_VALUES = [0, 2, 3, 4] as const satisfies readonly AccountType[];

export const CATEGORY_TYPE = {
  Income: 'Income',
  Expense: 'Expense',
} as const;

export type CategoryType = (typeof CATEGORY_TYPE)[keyof typeof CATEGORY_TYPE];

export const TRANSACTION_TYPE = {
  Income: 'Income',
  Expense: 'Expense',
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

export type StabilityStatusCode = 'good' | 'average' | 'poor';
export type StabilityActionCode =
  | 'keep_routine'
  | 'smooth_spikes'
  | 'cap_impulse_spend';
export type SubscriptionPlan = 'Month' | 'Year';
export type SubscriptionPaymentStatus =
  | 'Succeeded'
  | 'Failed'
  | 'Refunded'
  | 'Canceled';

// ━━━ SHARED ━━━

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

// ━━━ ACCOUNTS ━━━

/** DTO как возвращает бэкенд */
export interface AccountDto {
  id: string;
  currencyCode: string;
  name: string;
  type: AccountType | string | number;
  isLiquid: boolean;
  isArchived: boolean;
  isMain: boolean;
  currency?: Currency | null;
}

/** Фронтенд-модель с нормализованным типом */
export interface Account extends Omit<AccountDto, 'type'> {
  type: AccountType;
  currency?: Currency | null;
}

export interface CreateAccountPayload {
  currencyCode: string;
  type: AccountType;
  name: string;
  isLiquid?: boolean | null;
}

export interface AccountFormPayload {
  name: string;
  type: AccountType;
  currencyCode: string;
  isLiquid?: boolean | null;
}

export interface UpdateAccountPayload {
  id: string;
  name: string;
}

// ━━━ CATEGORIES ━━━

export interface TransactionCategoryDto {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: CategoryType;
  isMandatory?: boolean;
}

export interface Category extends TransactionCategoryDto {
  usageCount?: number;
}

export interface CreateCategoryPayload {
  categoryType: CategoryType;
  name: string;
  color: string;
  icon: string;
  isMandatory?: boolean;
}

export interface CategoryFormPayload {
  id?: string | null;
  categoryType: CategoryType;
  name: string;
  color: string;
  icon: string;
  isMandatory?: boolean;
}

export interface UpdateCategoryPayload {
  id: string;
  name: string;
  color: string;
  icon: string;
  isMandatory?: boolean;
}

// ━━━ TRANSACTIONS ━━━

export interface TransactionDto {
  id: string;
  accountId: string;
  categoryId: string | null;
  amount: number;
  amountInBaseCurrency?: number | null;
  originalAmount?: number | null;
  originalCurrencyCode?: string | null;
  type: TransactionType | string | number;
  occurredAt: string;
  description: string | null;
  isMandatory: boolean;
}

export interface Transaction extends Omit<TransactionDto, 'type'> {
  type: TransactionType;
  account?: Account;
  category?: Category | null;
}

export interface TransactionsQuery {
  accountId?: string | null;
  categoryId?: string | null;
  from?: string | null;
  to?: string | null;
  search?: string | null;
  isMandatory?: boolean | null;
  page?: number;
  size?: number;
}

export interface NewTransactionPayload {
  type: TransactionType;
  accountId: string;
  categoryId: string | null;
  amount: number;
  occurredAt: string;
  description: string | null;
  isMandatory: boolean;
}

export interface UpdateTransactionPayload {
  id: string;
  accountId: string;
  categoryId: string | null;
  amount: number;
  occurredAt: string;
  description: string | null;
  isMandatory: boolean;
}

// ━━━ USER & AUTH ━━━

export interface AuthResponse {
  email: string;
  userId: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface TelegramLoginPayload {
  id: number;
  auth_date: number;
  hash: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface CurrentUserDto {
  id: string;
  name: string;
  email: string | null;
  telegramUserId: number | null;
  registeredViaTelegram: boolean;
  baseCurrencyCode: string;
  subscription: SubscriptionInfoDto;
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
  isOwner: boolean;
}

export interface SubscriptionInfoDto {
  isActive: boolean;
  isReadOnlyMode: boolean;
  expiresAtUtc: string | null;
  monthPriceRub: number;
  yearPriceRub: number;
}

export interface SubscriptionPaymentDto {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionPaymentStatus;
  listedPriceRub: number;
  chargedPriceRub: number;
  billingPeriodMonths: number;
  grantedMonths: number;
  isSimulation: boolean;
  paidAtUtc: string;
  subscriptionStartsAtUtc: string;
  subscriptionEndsAtUtc: string;
  provider: string | null;
  externalPaymentId: string | null;
}

export interface UpdateUserProfilePayload {
  baseCurrencyCode: string;
  telegramUserId: number | null;
}

// ━━━ ANALYTICS ━━━

export interface MonthlyExpenseDto {
  year: number;
  month: number;
  day?: number | null;
  week?: number | null;
  amount: number;
}

export interface FinancialHealthSummaryDto {
  monthIncome: number | null;
  monthTotal: number | null;
  meanDaily: number | null;
  medianDaily: number | null;
  stabilityIndex: number | null;
  stabilityScore: number | null;
  stabilityStatus: StabilityStatusCode | null;
  stabilityActionCode: StabilityActionCode | null;
  stabilityIsPreview: boolean;
  savingsRate: number | null;
  netCashflow: number | null;
  discretionaryTotal: number | null;
  discretionarySharePercent: number | null;
  monthOverMonthChangePercent: number | null;
  liquidAssets: number | null;
  liquidMonths: number | null;
  liquidMonthsStatus: 'good' | 'average' | 'poor' | null;
  totalMonthScore: number | null;
  totalMonthScoreDeltaPoints: number | null;
  incomeMonthOverMonthChangePercent: number | null;
  balanceMonthOverMonthChangePercent: number | null;
}

export interface PeakDaysSummaryDto {
  count: number;
  total: number;
  sharePercent: number | null;
  monthTotal: number | null;
}

export interface PeakDayDto {
  year: number;
  month: number;
  day: number;
  amount: number;
  sharePercent: number | null;
}

export interface CategoryBreakdownItemDto {
  id: string | null;
  name: string;
  color: string;
  amount: number;
  mandatoryAmount: number;
  discretionaryAmount: number;
  percent: number | null;
  isMandatory: boolean;
}

export interface CategoryDeltaItemDto {
  id: string;
  name: string;
  color: string;
  currentAmount: number;
  previousAmount: number;
  deltaAmount: number;
  deltaPercent: number | null;
}

export interface CategoryDeltaDto {
  increased: CategoryDeltaItemDto[];
  decreased: CategoryDeltaItemDto[];
}

export interface CategoryBreakdownDto {
  items: CategoryBreakdownItemDto[];
  delta: CategoryDeltaDto;
}

export interface SpendingBreakdownDto {
  days: MonthlyExpenseDto[];
  weeks: MonthlyExpenseDto[];
  months: MonthlyExpenseDto[];
}

export interface ForecastSummaryDto {
  optimisticTotal: number | null;
  riskTotal: number | null;
  medianTotal: number | null;
  currentSpent: number | null;
  baselineLimit: number | null;
  availableAmount: number | null;
}

export interface ForecastSeriesDto {
  days: number[];
  actual: Array<number | null>;
  baseline: number | null;
}

export interface ForecastDto {
  summary: ForecastSummaryDto;
  series: ForecastSeriesDto;
}

export interface AnalyticsReadinessDto {
  hasForecastAndStabilityData: boolean;
  observedExpenseDays: number;
  requiredExpenseDays: number;
  hasStabilityDataForSelectedMonth: boolean;
  observedStabilityDaysInSelectedMonth: number;
  requiredStabilityDays: number;
}

export interface AnalyticsDashboardDto {
  year: number;
  month: number;
  health: FinancialHealthSummaryDto;
  peaks: PeakDaysSummaryDto;
  peakDays: PeakDayDto[];
  categories: CategoryBreakdownDto;
  incomeCategories: CategoryBreakdownDto;
  spending: SpendingBreakdownDto;
  forecast: ForecastDto;
  readiness: AnalyticsReadinessDto;
}

export interface NetWorthSnapshotDto {
  year: number;
  month: number;
  netWorth: number;
}

export interface EvolutionMonthDto {
  year: number;
  month: number;
  hasData: boolean;
  savingsRate: number | null;
  stabilityIndex: number | null;
  stabilityScore: number | null;
  stabilityStatus: StabilityStatusCode | null;
  stabilityActionCode: StabilityActionCode | null;
  discretionaryPercent: number | null;
  netWorth: number | null;
  liquidMonths: number | null;
  meanDaily: number | null;
  peakDayRatio: number | null;
  peakSpendSharePercent: number | null;
  totalMonthScore: number | null;
}

// ━━━ RETROSPECTIVES ━━━

export interface RetrospectiveListItemDto {
  month: string;
  disciplineRating: number | null;
  impulseControlRating: number | null;
  confidenceRating: number | null;
  conclusionPreview: string | null;
  winsPreview: string | null;
  hasContent: boolean;
}

export interface RetrospectiveDto {
  month: string;
  bannerDismissedAt: string | null;
  conclusion: string | null;
  nextMonthPlan: string | null;
  wins: string | null;
  savingsOpportunities: string | null;
  disciplineRating: number | null;
  impulseControlRating: number | null;
  confidenceRating: number | null;
}

export interface UpsertRetrospectivePayload {
  month: string;
  conclusion?: string | null;
  nextMonthPlan?: string | null;
  wins?: string | null;
  savingsOpportunities?: string | null;
  disciplineRating?: number | null;
  impulseControlRating?: number | null;
  confidenceRating?: number | null;
}

// ━━━ INVESTMENTS ━━━

export interface InvestmentAccountOverviewDto {
  id: string;
  name: string;
  currencyCode: string;
  type: AccountType | string | number;
  isLiquid: boolean;
  balance: number;
  balanceInBaseCurrency: number;
  lastAdjustedAt: string | null;
  returnPercent: number | null;
}

export interface InvestmentsOverviewDto {
  periodFrom: string;
  periodTo: string;
  totalValueInBaseCurrency: number;
  liquidValueInBaseCurrency: number;
  totalReturnPercent: number | null;
  accounts: InvestmentAccountOverviewDto[];
}

// ━━━ GOALS ━━━

export interface GoalSimulationRequestDto {
  targetAmount: number;
  initialCapital?: number | null;
  monthlyIncome?: number | null;
  monthlyExpenses?: number | null;
  annualReturnRate?: number | null;
}

export interface GoalSimulationParametersDto {
  initialCapital: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  annualReturnRate: number;
  isCapitalFromAnalytics: boolean;
  isIncomeFromAnalytics: boolean;
  isExpensesFromAnalytics: boolean;
}

export interface GoalPercentilePathsDto {
  p25: number[];
  p50: number[];
  p75: number[];
}

export interface GoalSimulationResultDto {
  probability: number;
  dataQualityScore: number;
  medianMonths: number;
  p25Months: number;
  p75Months: number;
  percentilePaths: GoalPercentilePathsDto;
  resolvedParameters: GoalSimulationParametersDto;
  isAchievable: boolean;
  monthLabels: string[];
}

// ━━━ FREEDOM CALCULATOR ━━━

export interface FreedomCalculatorDefaultsDto {
  capital: number;
  monthlyExpenses: number;
}

export interface FreedomCalculatorRequestDto {
  capital: number;
  monthlyExpenses: number;
  swrPercent: number;
  inflationRatePercent: number;
  inflationEnabled: boolean;
}

export interface FreedomCalculatorResultDto {
  freeDaysPerYear: number;
  percentToFi: number;
  annualPassiveIncome: number;
  annualEffectiveExpenses: number;
}

// ━━━ ADMIN ━━━

export interface AdminKpisDto {
  totalUsers: number;
  activeSubscriptions: number;
  activeSubscriptionsRatePercent: number;
  onboardingCompletedUsers: number;
  onboardingCompletionRatePercent: number;
  totalAccounts: number;
  totalTransactions: number;
  transactionsLast30Days: number;
}

export interface AdminUserSnapshotDto {
  userId: string;
  email: string | null;
  name: string;
  isOwner: boolean;
  hasActiveSubscription: boolean;
  isOnboardingCompleted: boolean;
  isTelegramLinked: boolean;
  transactionsCount: number;
  lastTransactionAtUtc: string | null;
}

export interface AdminOverviewDto {
  kpis: AdminKpisDto;
  users: AdminUserSnapshotDto[];
}
