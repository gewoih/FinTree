# Block 2 — Types & API Layer

> **Для AI-агента:** Этот документ — твоё единственное задание. Не смотри в `vue-app/` за референсом. Используй только информацию из этого документа. Предполагается, что Block 1 (`01-foundation.md`) уже выполнен: `react-app/` создан, Axios instance существует в `react-app/src/api/index.ts`.

---

## Shared Context

- Репозиторий: monorepo. Вся работа ведётся внутри `react-app/`
- Backend API base: `https://localhost:5001` — проксируется Vite на `/api`
- Auth: cookie-based сессия (httpOnly, `withCredentials: true`). Axios instance уже настроен с interceptors (см. Block 1)
- Locale: `ru-RU`
- Нет `any` в TypeScript

---

## Tech Stack (для этого блока)

- TypeScript ~5.x
- Axios (instance из `api/index.ts`)
- TanStack Query v5 (key factory в `api/queryKeys.ts`)
- Zod (валидация форм)
- React Hook Form (интеграция через `@hookform/resolvers/zod`)

---

## Goal

После выполнения этого блока должно существовать:
- `react-app/src/types/index.ts` — все DTO и интерфейсы
- `react-app/src/api/queryKeys.ts` — type-safe key factory
- `react-app/src/api/index.ts` — axios instance (уже из Block 1, не трогать)
- `react-app/src/api/auth.ts`
- `react-app/src/api/accounts.ts`
- `react-app/src/api/transactions.ts`
- `react-app/src/api/categories.ts`
- `react-app/src/api/transfers.ts`
- `react-app/src/api/analytics.ts`
- `react-app/src/api/goals.ts`
- `react-app/src/api/freedom.ts`
- `react-app/src/api/investments.ts`
- `react-app/src/api/admin.ts`
- Zod-схемы для всех форм

---

## Specs

### 1. `src/types/index.ts` — все DTO

```typescript
// react-app/src/types/index.ts

// ━━━ ENUMS & UNION TYPES ━━━

/** 0 = Bank, 2 = Crypto, 3 = Brokerage, 4 = Deposit */
export type AccountType = 0 | 2 | 3 | 4;

export const CATEGORY_TYPE = {
  Income:  'Income',
  Expense: 'Expense',
} as const;

export type CategoryType = typeof CATEGORY_TYPE[keyof typeof CATEGORY_TYPE];

export const TRANSACTION_TYPE = {
  Income:  'Income',
  Expense: 'Expense',
} as const;

export type TransactionType = typeof TRANSACTION_TYPE[keyof typeof TRANSACTION_TYPE];

export type StabilityStatusCode = 'good' | 'average' | 'poor';
export type StabilityActionCode = 'keep_routine' | 'smooth_spikes' | 'cap_impulse_spend';
export type SubscriptionPlan = 'Month' | 'Year';
export type SubscriptionPaymentStatus = 'Succeeded' | 'Failed' | 'Refunded' | 'Canceled';

// ━━━ SHARED ━━━

export interface Currency {
  code:   string;
  name:   string;
  symbol: string;
}

export interface PagedResult<T> {
  items: T[];
  page:  number;
  size:  number;
  total: number;
}

// ━━━ ACCOUNTS ━━━

/** DTO как возвращает бэкенд */
export interface AccountDto {
  id:                    string;  // Guid
  currencyCode:          string;
  name:                  string;
  type:                  AccountType | string | number;  // бэкенд может вернуть строку "Bank" или число
  isLiquid:              boolean;
  isArchived:            boolean;
  isMain:                boolean;
  balance:               number;
  balanceInBaseCurrency: number;
}

/** Фронтенд-модель с нормализованным типом */
export interface Account extends Omit<AccountDto, 'type'> {
  type:      AccountType;
  currency?: Currency | null;
}

export interface CreateAccountPayload {
  currencyCode: string;
  type:         AccountType;
  name:         string;
  isLiquid?:    boolean | null;
}

export interface AccountFormPayload {
  name:        string;
  type:        AccountType;
  currencyCode: string;
  isLiquid?:   boolean | null;
}

export interface UpdateAccountPayload {
  id:   string;
  name: string;
}

export interface AccountBalanceAdjustmentDto {
  id:         string;
  accountId:  string;
  amount:     number;
  occurredAt: string;
}

// ━━━ CATEGORIES ━━━

export interface TransactionCategoryDto {
  id:          string;  // Guid
  name:        string;
  color:       string;
  icon:        string;
  type:        CategoryType;
  isMandatory?: boolean;
}

export interface Category extends TransactionCategoryDto {
  usageCount?: number;
}

export interface CreateCategoryPayload {
  categoryType: CategoryType;
  name:         string;
  color:        string;
  icon:         string;
  isMandatory?: boolean;
}

export interface CategoryFormPayload {
  id?:          string | null;
  categoryType: CategoryType;
  name:         string;
  color:        string;
  icon:         string;
  isMandatory?: boolean;
}

export interface UpdateCategoryPayload {
  id:          string;
  name:        string;
  color:       string;
  icon:        string;
  isMandatory?: boolean;
}

// ━━━ TRANSACTIONS ━━━

export interface TransactionDto {
  id:                    string;
  accountId:             string;
  categoryId:            string;
  amount:                number;
  amountInBaseCurrency?: number | null;
  originalAmount?:       number | null;
  originalCurrencyCode?: string | null;
  type:                  TransactionType | string | number;
  occurredAt:            string;  // ISO datetime
  description:           string | null;
  isMandatory:           boolean;
  isTransfer?:           boolean;
  transferId?:           string | null;
}

export interface Transaction extends Omit<TransactionDto, 'type'> {
  type:       TransactionType;
  account?:   Account;
  category?:  Category | null;
  isTransfer?: boolean;
  transferId?: string | null;
}

export interface TransactionsQuery {
  accountId?:  string | null;
  categoryId?: string | null;
  from?:       string | null;  // ISO date
  to?:         string | null;  // ISO date
  search?:     string | null;
  page?:       number;
  size?:       number;
}

export interface NewTransactionPayload {
  type:        TransactionType;
  accountId:   string;
  categoryId:  string;
  amount:      number;
  occurredAt:  string;          // ISO datetime
  description: string | null;
  isMandatory: boolean;
}

export interface UpdateTransactionPayload {
  id:          string;
  type:        TransactionType;
  accountId:   string;
  categoryId:  string;
  amount:      number;
  occurredAt:  string;
  description: string | null;
  isMandatory: boolean;
}

// ━━━ TRANSFERS ━━━

export interface CreateTransferPayload {
  fromAccountId: string;
  toAccountId:   string;
  fromAmount:    number;
  toAmount:      number;
  occurredAt:    string;
  feeAmount?:    number | null;
  description?:  string | null;
}

export interface UpdateTransferPayload {
  transferId:    string;
  fromAccountId: string;
  toAccountId:   string;
  fromAmount:    number;
  toAmount:      number;
  occurredAt:    string;
  feeAmount?:    number | null;
  description?:  string | null;
}

// ━━━ USER & AUTH ━━━

export interface AuthResponse {
  email:  string;
  userId: string;
}

export interface LoginPayload {
  email:    string;
  password: string;
}

export interface RegisterPayload {
  email:                string;
  password:             string;
  passwordConfirmation: string;
}

export interface TelegramLoginPayload {
  id:          number;
  auth_date:   number;
  hash:        string;
  first_name?: string;
  last_name?:  string;
  username?:   string;
  photo_url?:  string;
}

export interface CurrentUserDto {
  id:                    string;
  name:                  string;
  email:                 string | null;
  telegramUserId:        number | null;
  registeredViaTelegram: boolean;
  baseCurrencyCode:      string;
  subscription:          SubscriptionInfoDto;
  onboardingCompleted:   boolean;
  onboardingSkipped:     boolean;
  isOwner:               boolean;
}

export interface SubscriptionInfoDto {
  isActive:        boolean;
  isReadOnlyMode:  boolean;
  expiresAtUtc:    string | null;
  monthPriceRub:   number;
  yearPriceRub:    number;
}

export interface SubscriptionPaymentDto {
  id:                       string;
  plan:                     SubscriptionPlan;
  status:                   SubscriptionPaymentStatus;
  listedPriceRub:           number;
  chargedPriceRub:          number;
  billingPeriodMonths:      number;
  grantedMonths:            number;
  isSimulation:             boolean;
  paidAtUtc:                string;
  subscriptionStartsAtUtc:  string;
  subscriptionEndsAtUtc:    string;
  provider:                 string | null;
  externalPaymentId:        string | null;
}

export interface UpdateUserProfilePayload {
  baseCurrencyCode: string;
  telegramUserId:   number | null;
}

// ━━━ ANALYTICS ━━━

export interface MonthlyExpenseDto {
  year:    number;
  month:   number;
  day?:    number | null;
  week?:   number | null;
  amount:  number;
}

export interface FinancialHealthSummaryDto {
  monthIncome:                       number | null;
  monthTotal:                        number | null;
  meanDaily:                         number | null;
  medianDaily:                       number | null;
  stabilityIndex:                    number | null;
  stabilityScore:                    number | null;
  stabilityStatus:                   StabilityStatusCode | null;
  stabilityActionCode:               StabilityActionCode | null;
  savingsRate:                       number | null;
  netCashflow:                       number | null;
  discretionaryTotal:                number | null;
  discretionarySharePercent:         number | null;
  monthOverMonthChangePercent:       number | null;
  liquidAssets:                      number | null;
  liquidMonths:                      number | null;
  liquidMonthsStatus:                'good' | 'average' | 'poor' | null;
  totalMonthScore:                   number | null;
  incomeMonthOverMonthChangePercent: number | null;
  balanceMonthOverMonthChangePercent: number | null;
}

export interface PeakDaysSummaryDto {
  count:        number;
  total:        number;
  sharePercent: number | null;
  monthTotal:   number | null;
}

export interface PeakDayDto {
  year:         number;
  month:        number;
  day:          number;
  amount:       number;
  sharePercent: number | null;
}

export interface CategoryBreakdownItemDto {
  id:                  string;
  name:                string;
  color:               string;
  amount:              number;
  mandatoryAmount:     number;
  discretionaryAmount: number;
  percent:             number | null;
  isMandatory:         boolean;
}

export interface CategoryDeltaItemDto {
  id:             string;
  name:           string;
  color:          string;
  currentAmount:  number;
  previousAmount: number;
  deltaAmount:    number;
  deltaPercent:   number | null;
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
  days:   MonthlyExpenseDto[];
  weeks:  MonthlyExpenseDto[];
  months: MonthlyExpenseDto[];
}

export interface ForecastSummaryDto {
  optimisticTotal: number | null;
  riskTotal:       number | null;
  currentSpent:    number | null;
  baselineLimit:   number | null;
}

export interface ForecastSeriesDto {
  days:       number[];
  actual:     Array<number | null>;
  optimistic: Array<number | null>;
  risk:       Array<number | null>;
  baseline:   number | null;
}

export interface ForecastDto {
  summary: ForecastSummaryDto;
  series:  ForecastSeriesDto;
}

export interface AnalyticsReadinessDto {
  hasForecastAndStabilityData:           boolean;
  observedExpenseDays:                   number;
  requiredExpenseDays:                   number;
  hasStabilityDataForSelectedMonth:      boolean;
  observedStabilityDaysInSelectedMonth:  number;
  requiredStabilityDays:                 number;
}

export interface AnalyticsDashboardDto {
  year:             number;
  month:            number;
  health:           FinancialHealthSummaryDto;
  peaks:            PeakDaysSummaryDto;
  peakDays:         PeakDayDto[];
  categories:       CategoryBreakdownDto;
  incomeCategories: CategoryBreakdownDto;
  spending:         SpendingBreakdownDto;
  forecast:         ForecastDto;
  readiness:        AnalyticsReadinessDto;
}

export interface NetWorthSnapshotDto {
  year:     number;
  month:    number;
  netWorth: number;
}

export interface EvolutionMonthDto {
  year:                    number;
  month:                   number;
  hasData:                 boolean;
  savingsRate:             number | null;
  stabilityIndex:          number | null;
  stabilityScore:          number | null;
  stabilityStatus:         StabilityStatusCode | null;
  stabilityActionCode:     StabilityActionCode | null;
  discretionaryPercent:    number | null;
  netWorth:                number | null;
  liquidMonths:            number | null;
  meanDaily:               number | null;
  peakDayRatio:            number | null;
  peakSpendSharePercent:   number | null;
  totalMonthScore:         number | null;
}

// ━━━ RETROSPECTIVES ━━━

export interface RetrospectiveListItemDto {
  month:                 string;  // "YYYY-MM"
  disciplineRating:      number | null;
  impulseControlRating:  number | null;
  confidenceRating:      number | null;
  conclusionPreview:     string | null;
  winsPreview:           string | null;
  hasContent:            boolean;
}

export interface RetrospectiveDto {
  month:                 string;  // "YYYY-MM"
  bannerDismissedAt:     string | null;
  conclusion:            string | null;
  nextMonthPlan:         string | null;
  wins:                  string | null;
  savingsOpportunities:  string | null;
  disciplineRating:      number | null;
  impulseControlRating:  number | null;
  confidenceRating:      number | null;
}

export interface UpsertRetrospectivePayload {
  month:                  string;
  conclusion?:            string | null;
  nextMonthPlan?:         string | null;
  wins?:                  string | null;
  savingsOpportunities?:  string | null;
  disciplineRating?:      number | null;
  impulseControlRating?:  number | null;
  confidenceRating?:      number | null;
}

// ━━━ INVESTMENTS ━━━

export interface InvestmentAccountOverviewDto {
  id:                    string;
  name:                  string;
  currencyCode:          string;
  type:                  AccountType | string | number;
  isLiquid:              boolean;
  balance:               number;
  balanceInBaseCurrency: number;
  lastAdjustedAt:        string | null;
  returnPercent:         number | null;
}

export interface InvestmentsOverviewDto {
  periodFrom:                 string;
  periodTo:                   string;
  totalValueInBaseCurrency:   number;
  liquidValueInBaseCurrency:  number;
  totalReturnPercent:         number | null;
  accounts:                   InvestmentAccountOverviewDto[];
}

// ━━━ GOALS ━━━

export interface GoalSimulationRequestDto {
  targetAmount:      number;
  initialCapital?:   number | null;
  monthlyIncome?:    number | null;
  monthlyExpenses?:  number | null;
  annualReturnRate?: number | null;
}

export interface GoalSimulationParametersDto {
  initialCapital:         number;
  monthlyIncome:          number;
  monthlyExpenses:        number;
  annualReturnRate:       number;
  isCapitalFromAnalytics: boolean;
  isIncomeFromAnalytics:  boolean;
  isExpensesFromAnalytics: boolean;
}

export interface GoalPercentilePathsDto {
  p25: number[];
  p50: number[];
  p75: number[];
}

export interface GoalSimulationResultDto {
  probability:          number;
  dataQualityScore:     number;
  medianMonths:         number;
  p25Months:            number;
  p75Months:            number;
  percentilePaths:      GoalPercentilePathsDto;
  resolvedParameters:   GoalSimulationParametersDto;
  isAchievable:         boolean;
  monthLabels:          string[];
}

// ━━━ FREEDOM CALCULATOR ━━━

export interface FreedomCalculatorDefaultsDto {
  capital:          number;
  monthlyExpenses:  number;
}

export interface FreedomCalculatorRequestDto {
  capital:               number;
  monthlyExpenses:       number;
  swrPercent:            number;
  inflationRatePercent:  number;
  inflationEnabled:      boolean;
}

export interface FreedomCalculatorResultDto {
  freeDaysPerYear:          number;
  percentToFi:              number;
  annualPassiveIncome:      number;
  annualEffectiveExpenses:  number;
}

// ━━━ ADMIN ━━━

export interface AdminKpisDto {
  totalUsers:                       number;
  activeSubscriptions:              number;
  activeSubscriptionsRatePercent:   number;
  onboardingCompletedUsers:         number;
  onboardingCompletionRatePercent:  number;
  totalAccounts:                    number;
  totalTransactions:                number;
  transactionsLast30Days:           number;
}

export interface AdminUserSnapshotDto {
  userId:                string;
  email:                 string | null;
  name:                  string;
  isOwner:               boolean;
  hasActiveSubscription: boolean;
  isOnboardingCompleted: boolean;
  isTelegramLinked:      boolean;
  transactionsCount:     number;
  lastTransactionAtUtc:  string | null;
}

export interface AdminOverviewDto {
  kpis:  AdminKpisDto;
  users: AdminUserSnapshotDto[];
}
```

---

### 2. `src/api/queryKeys.ts` — TanStack Query key factory

```typescript
// src/api/queryKeys.ts
export const queryKeys = {
  // Auth
  currentUser: () => ['currentUser'] as const,

  // Accounts
  accounts: {
    all: () => ['accounts'] as const,
    lists: () => [...queryKeys.accounts.all(), 'list'] as const,
    active: () => [...queryKeys.accounts.lists(), 'active'] as const,
    archived: () => [...queryKeys.accounts.lists(), 'archived'] as const,
    detail: (id: string) => [...queryKeys.accounts.all(), 'detail', id] as const,
    adjustments: (accountId: string) => [...queryKeys.accounts.detail(accountId), 'adjustments'] as const,
  },

  // Transactions
  transactions: {
    all: () => ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all(), 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.transactions.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.transactions.all(), 'detail', id] as const,
  },

  // Categories
  categories: {
    all: () => ['categories'] as const,
    list: () => [...queryKeys.categories.all(), 'list'] as const,
    withUsage: () => [...queryKeys.categories.all(), 'withUsage'] as const,
  },

  // Analytics
  analytics: {
    all: () => ['analytics'] as const,
    dashboard: () => [...queryKeys.analytics.all(), 'dashboard'] as const,
    netWorth: (params?: { from?: string; to?: string }) =>
      [...queryKeys.analytics.all(), 'netWorth', params] as const,
    evolution: (year?: number) =>
      [...queryKeys.analytics.all(), 'evolution', { year }] as const,
  },

  // Retrospectives
  retrospectives: {
    all: () => ['retrospectives'] as const,
    list: () => [...queryKeys.retrospectives.all(), 'list'] as const,
    detail: (month: string) => [...queryKeys.retrospectives.all(), 'detail', month] as const,
  },

  // Goals
  goals: {
    all: () => ['goals'] as const,
    simulation: (params: Record<string, unknown>) =>
      [...queryKeys.goals.all(), 'simulation', params] as const,
  },

  // Freedom
  freedom: {
    all: () => ['freedom'] as const,
    defaults: () => [...queryKeys.freedom.all(), 'defaults'] as const,
    calculate: (params: Record<string, unknown>) =>
      [...queryKeys.freedom.all(), 'calculate', params] as const,
  },

  // Investments
  investments: {
    all: () => ['investments'] as const,
    overview: () => [...queryKeys.investments.all(), 'overview'] as const,
  },

  // Admin
  admin: {
    all: () => ['admin'] as const,
    overview: () => [...queryKeys.admin.all(), 'overview'] as const,
  },

  // Currencies
  currencies: () => ['currencies'] as const,
} as const
```

---

### 3. `src/api/auth.ts`

```typescript
// react-app/src/api/auth.ts
import { apiClient, type AuthRequestConfig } from './index';
import type { AuthResponse, LoginPayload, RegisterPayload, TelegramLoginPayload } from '@/types';

const AUTH_CONFIG: AuthRequestConfig = {
  skipAuthRedirect: true,
  skipAuthRefresh:  true,
};

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', payload, AUTH_CONFIG);
  return res.data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/register', payload, AUTH_CONFIG);
  return res.data;
}

export async function loginWithTelegram(payload: TelegramLoginPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/telegram', payload, AUTH_CONFIG);
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout', null, AUTH_CONFIG);
}

// Используется внутри Axios interceptor; отдельный вызов не нужен.
// Expose здесь только для возможного ручного вызова в тестах.
export async function refreshToken(): Promise<void> {
  await apiClient.post('/auth/refresh', null, AUTH_CONFIG);
}
```

---

### 4. `src/api/accounts.ts`

```typescript
// react-app/src/api/accounts.ts
import { apiClient } from './index';
import type {
  AccountDto,
  CreateAccountPayload,
  UpdateAccountPayload,
  AccountBalanceAdjustmentDto,
} from '@/types';

export async function getAccounts(archived = false): Promise<AccountDto[]> {
  const res = await apiClient.get<AccountDto[]>('/users/accounts', {
    params: { archived },
  });
  return res.data;
}

export async function createAccount(payload: CreateAccountPayload): Promise<string> {
  const res = await apiClient.post<string>('/accounts', payload);
  return res.data;
}

export async function updateAccount(payload: UpdateAccountPayload): Promise<void> {
  await apiClient.patch(`/accounts/${payload.id}`, { name: payload.name });
}

export async function setPrimaryAccount(accountId: string): Promise<void> {
  // Backend expects raw JSON string (quoted accountId)
  await apiClient.patch('/users/main-account', JSON.stringify(accountId), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateAccountLiquidity(accountId: string, isLiquid: boolean): Promise<void> {
  await apiClient.patch(`/accounts/${accountId}/liquidity`, { isLiquid });
}

export async function archiveAccount(accountId: string): Promise<void> {
  await apiClient.patch(`/accounts/${accountId}/archive`);
}

export async function unarchiveAccount(accountId: string): Promise<void> {
  await apiClient.patch(`/accounts/${accountId}/unarchive`);
}

export async function deleteAccount(accountId: string): Promise<void> {
  await apiClient.delete(`/accounts/${accountId}`);
}

export async function getAccountBalanceAdjustments(
  accountId: string
): Promise<AccountBalanceAdjustmentDto[]> {
  const res = await apiClient.get<AccountBalanceAdjustmentDto[]>(
    `/accounts/${accountId}/balance-adjustments`
  );
  return res.data;
}

export async function createAccountBalanceAdjustment(
  accountId: string,
  amount: number
): Promise<string> {
  const res = await apiClient.post<string>(
    `/accounts/${accountId}/balance-adjustments`,
    { amount }
  );
  return res.data;
}
```

---

### 5. `src/api/transactions.ts`

```typescript
// react-app/src/api/transactions.ts
import { apiClient } from './index';
import type {
  TransactionDto,
  NewTransactionPayload,
  UpdateTransactionPayload,
  PagedResult,
  TransactionsQuery,
} from '@/types';

export async function getTransactions(
  query: TransactionsQuery = {}
): Promise<PagedResult<TransactionDto>> {
  // Only send non-null/undefined params
  const params: Record<string, string | number> = {};
  if (query.accountId)  params.accountId  = query.accountId;
  if (query.categoryId) params.categoryId = query.categoryId;
  if (query.from)       params.from       = query.from;
  if (query.to)         params.to         = query.to;
  if (query.search)     params.search     = query.search;
  if (query.page)       params.page       = query.page;
  if (query.size)       params.size       = query.size;

  const res = await apiClient.get<PagedResult<TransactionDto>>('/transaction', { params });
  return res.data;
}

export async function createTransaction(payload: NewTransactionPayload): Promise<string> {
  const body = {
    type:        payload.type,
    accountId:   payload.accountId,
    categoryId:  payload.categoryId,
    amount:      Math.abs(payload.amount),   // always positive; type encodes direction
    occurredAt:  payload.occurredAt,
    description: payload.description,
    isMandatory: payload.isMandatory ?? false,
  };
  const res = await apiClient.post<string>('/Transaction', body);
  return res.data;
}

export async function updateTransaction(payload: UpdateTransactionPayload): Promise<void> {
  const body = {
    id:          payload.id,
    accountId:   payload.accountId,
    categoryId:  payload.categoryId,
    amount:      Math.abs(payload.amount),
    occurredAt:  payload.occurredAt,
    description: payload.description,
    isMandatory: payload.isMandatory ?? false,
  };
  await apiClient.patch('/Transaction', body);
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiClient.delete('/Transaction', { params: { id } });
}

/** Returns { blob, fileName } for file download */
export async function exportTransactions(): Promise<{ blob: Blob; fileName: string }> {
  const res = await apiClient.get<Blob>('/transaction/export', { responseType: 'blob' });
  const disposition = res.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  const fileName = match?.[1] ?? `transactions_${new Date().toISOString().slice(0, 10)}.txt`;
  return { blob: res.data, fileName };
}
```

---

### 6. `src/api/categories.ts`

```typescript
// react-app/src/api/categories.ts
import { apiClient } from './index';
import type {
  TransactionCategoryDto,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@/types';

export async function getCategories(): Promise<TransactionCategoryDto[]> {
  const res = await apiClient.get<TransactionCategoryDto[]>('/users/categories');
  return res.data;
}

export async function createCategory(payload: CreateCategoryPayload): Promise<string> {
  const res = await apiClient.post<string>('/TransactionCategory', payload);
  return res.data;
}

export async function updateCategory(payload: UpdateCategoryPayload): Promise<void> {
  await apiClient.patch('/TransactionCategory', payload);
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete('/TransactionCategory', { params: { id } });
}
```

---

### 7. `src/api/transfers.ts`

```typescript
// react-app/src/api/transfers.ts
import { apiClient } from './index';
import type { CreateTransferPayload, UpdateTransferPayload } from '@/types';

export async function createTransfer(payload: CreateTransferPayload): Promise<string> {
  const body = {
    fromAccountId: payload.fromAccountId,
    toAccountId:   payload.toAccountId,
    fromAmount:    Math.abs(payload.fromAmount),
    toAmount:      Math.abs(payload.toAmount),
    occurredAt:    payload.occurredAt,
    feeAmount:     payload.feeAmount != null ? Math.abs(payload.feeAmount) : null,
    description:   payload.description,
  };
  const res = await apiClient.post<string>('/Transaction/transfer', body);
  return res.data;
}

export async function updateTransfer(payload: UpdateTransferPayload): Promise<void> {
  const body = {
    transferId:    payload.transferId,
    fromAccountId: payload.fromAccountId,
    toAccountId:   payload.toAccountId,
    fromAmount:    Math.abs(payload.fromAmount),
    toAmount:      Math.abs(payload.toAmount),
    occurredAt:    payload.occurredAt,
    feeAmount:     payload.feeAmount != null ? Math.abs(payload.feeAmount) : null,
    description:   payload.description,
  };
  await apiClient.patch('/Transaction/transfer', body);
}

export async function deleteTransfer(transferId: string): Promise<void> {
  await apiClient.delete('/Transaction/transfer', { params: { transferId } });
}
```

---

### 8. `src/api/analytics.ts`

```typescript
// react-app/src/api/analytics.ts
import { apiClient } from './index';
import type {
  AnalyticsDashboardDto,
  NetWorthSnapshotDto,
  EvolutionMonthDto,
} from '@/types';

export async function getAnalyticsDashboard(
  year: number,
  month: number
): Promise<AnalyticsDashboardDto> {
  const res = await apiClient.get<AnalyticsDashboardDto>('/analytics/dashboard', {
    params: { year, month },
  });
  return res.data;
}

export async function getNetWorthTrend(months?: number): Promise<NetWorthSnapshotDto[]> {
  const res = await apiClient.get<NetWorthSnapshotDto[]>('/analytics/net-worth', {
    params: months ? { months } : {},
  });
  return res.data;
}

export async function getEvolution(months: number): Promise<EvolutionMonthDto[]> {
  const res = await apiClient.get<EvolutionMonthDto[]>('/analytics/evolution', {
    params: { months },
  });
  return res.data;
}
```

---

### 9. `src/api/goals.ts`

```typescript
// react-app/src/api/goals.ts
import { apiClient } from './index';
import type {
  GoalSimulationRequestDto,
  GoalSimulationResultDto,
  GoalSimulationParametersDto,
} from '@/types';

export async function getGoalSimulationDefaults(): Promise<GoalSimulationParametersDto> {
  const res = await apiClient.get<GoalSimulationParametersDto>('/goals/simulation-defaults');
  return res.data;
}

export async function simulateGoal(
  request: GoalSimulationRequestDto
): Promise<GoalSimulationResultDto> {
  const res = await apiClient.post<GoalSimulationResultDto>('/goals/simulate', request);
  return res.data;
}
```

---

### 10. `src/api/freedom.ts`

```typescript
// react-app/src/api/freedom.ts
import { apiClient } from './index';
import type {
  FreedomCalculatorDefaultsDto,
  FreedomCalculatorRequestDto,
  FreedomCalculatorResultDto,
} from '@/types';

export async function getFreedomCalculatorDefaults(): Promise<FreedomCalculatorDefaultsDto> {
  const res = await apiClient.get<FreedomCalculatorDefaultsDto>('/freedom-calculator/defaults');
  return res.data;
}

export async function calculateFreedom(
  request: FreedomCalculatorRequestDto
): Promise<FreedomCalculatorResultDto> {
  const res = await apiClient.post<FreedomCalculatorResultDto>(
    '/freedom-calculator/calculate',
    request
  );
  return res.data;
}
```

---

### 11. `src/api/investments.ts`

```typescript
// react-app/src/api/investments.ts
import { apiClient } from './index';
import type { InvestmentsOverviewDto } from '@/types';

export async function getInvestmentsOverview(
  from?: string,
  to?: string
): Promise<InvestmentsOverviewDto> {
  const res = await apiClient.get<InvestmentsOverviewDto>('/accounts/investments', {
    params: {
      ...(from ? { from } : {}),
      ...(to   ? { to }   : {}),
    },
  });
  return res.data;
}
```

---

### 12. `src/api/admin.ts`

```typescript
// react-app/src/api/admin.ts
import { apiClient } from './index';
import type { AdminOverviewDto } from '@/types';

export async function getAdminOverview(): Promise<AdminOverviewDto> {
  const res = await apiClient.get<AdminOverviewDto>('/admin/overview');
  return res.data;
}
```

---

### 13. Retrospectives API (добавить в отдельный файл `src/api/retrospectives.ts`)

```typescript
// react-app/src/api/retrospectives.ts
import { apiClient } from './index';
import type {
  RetrospectiveDto,
  RetrospectiveListItemDto,
  UpsertRetrospectivePayload,
} from '@/types';

export async function getRetrospectives(): Promise<RetrospectiveListItemDto[]> {
  const res = await apiClient.get<RetrospectiveListItemDto[]>('/retrospectives');
  return res.data;
}

export async function getRetrospectiveAvailableMonths(): Promise<string[]> {
  const res = await apiClient.get<string[]>('/retrospectives/available-months');
  return res.data;
}

export async function getRetrospective(month: string): Promise<RetrospectiveDto> {
  const res = await apiClient.get<RetrospectiveDto>(`/retrospectives/${month}`);
  return res.data;
}

export async function getBannerStatus(month: string): Promise<{ showBanner: boolean }> {
  const res = await apiClient.get<{ showBanner: boolean }>(`/retrospectives/banner/${month}`);
  return res.data;
}

export async function upsertRetrospective(
  payload: UpsertRetrospectivePayload
): Promise<RetrospectiveDto> {
  const res = await apiClient.post<RetrospectiveDto>('/retrospectives', payload);
  return res.data;
}

export async function deleteRetrospective(month: string): Promise<void> {
  await apiClient.delete(`/retrospectives/${month}`);
}

export async function dismissBanner(month: string): Promise<void> {
  await apiClient.post(`/retrospectives/${month}/dismiss`);
}
```

> **Примечание:** Добавь `retrospectives` в `queryKeys.ts` — ключи уже присутствуют в Block 2, секция `queryKeys.retrospectives`.

---

### 14. User API (добавить в `src/api/user.ts`)

```typescript
// react-app/src/api/user.ts
import { apiClient, type AuthRequestConfig } from './index';
import type {
  CurrentUserDto,
  UpdateUserProfilePayload,
  SubscriptionPaymentDto,
  SubscriptionPlan,
  Currency,
} from '@/types';

export async function getCurrentUser(): Promise<CurrentUserDto> {
  const res = await apiClient.get<CurrentUserDto>('/users/me', {
    skipAuthRedirect: true,
  } as AuthRequestConfig);
  return res.data;
}

export async function skipOnboarding(): Promise<CurrentUserDto> {
  const res = await apiClient.post<CurrentUserDto>('/users/me/skip-onboarding');
  return res.data;
}

export async function updateUserProfile(
  payload: UpdateUserProfilePayload
): Promise<CurrentUserDto> {
  const res = await apiClient.patch<CurrentUserDto>('/users/me', payload);
  return res.data;
}

export async function simulateSubscriptionPayment(
  plan: SubscriptionPlan
): Promise<CurrentUserDto> {
  const res = await apiClient.post<CurrentUserDto>('/users/subscription/pay', { plan });
  return res.data;
}

export async function getSubscriptionPayments(): Promise<SubscriptionPaymentDto[]> {
  const res = await apiClient.get<SubscriptionPaymentDto[]>('/users/subscription/payments');
  return res.data;
}

export async function getCurrencies(): Promise<Currency[]> {
  const res = await apiClient.get<Currency[]>('/currencies');
  return res.data;
}
```

> **Обновление queryKeys.ts:** добавь ключ для `currencies`:
> `currencies: () => ['currencies'] as const` — уже включён в spec выше.

---

### 15. Zod-схемы для форм

Создай файл `src/utils/schemas.ts`:

```typescript
// react-app/src/utils/schemas.ts
import { z } from 'zod';

// ━━━ AUTH ━━━

export const loginSchema = z.object({
  email:    z.string().min(1, 'Введите email').email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль').min(6, 'Минимум 6 символов'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email:                z.string().min(1, 'Введите email').email('Некорректный email'),
    password:             z.string().min(6, 'Минимум 6 символов'),
    passwordConfirmation: z.string().min(1, 'Подтвердите пароль'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message:  'Пароли не совпадают',
    path:     ['passwordConfirmation'],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

// ━━━ ACCOUNTS ━━━

export const createAccountSchema = z.object({
  name:        z.string().min(1, 'Введите название').max(100, 'Максимум 100 символов'),
  type:        z.union([z.literal(0), z.literal(2), z.literal(3), z.literal(4)], {
    errorMap: () => ({ message: 'Выберите тип счёта' }),
  }),
  currencyCode: z.string().min(1, 'Выберите валюту'),
  isLiquid:    z.boolean().optional(),
});
export type CreateAccountFormValues = z.infer<typeof createAccountSchema>;

// ━━━ TRANSACTIONS ━━━

export const newTransactionSchema = z.object({
  type:        z.enum(['Income', 'Expense'], { errorMap: () => ({ message: 'Выберите тип' }) }),
  accountId:   z.string().min(1, 'Выберите счёт'),
  categoryId:  z.string().min(1, 'Выберите категорию'),
  amount:      z.number({ invalid_type_error: 'Введите сумму' }).positive('Сумма должна быть больше 0'),
  occurredAt:  z.string().min(1, 'Укажите дату'),
  description: z.string().nullable().optional(),
  isMandatory: z.boolean(),
});
export type NewTransactionFormValues = z.infer<typeof newTransactionSchema>;

// ━━━ CATEGORIES ━━━

export const createCategorySchema = z.object({
  categoryType: z.enum(['Income', 'Expense'], {
    errorMap: () => ({ message: 'Выберите тип категории' }),
  }),
  name:        z.string().min(1, 'Введите название').max(100, 'Максимум 100 символов'),
  color:       z.string().min(1, 'Выберите цвет').regex(/^#[0-9A-Fa-f]{6}$/, 'Некорректный HEX'),
  icon:        z.string().min(1, 'Выберите иконку'),
  isMandatory: z.boolean().optional(),
});
export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;

// ━━━ USER PROFILE ━━━

export const updateProfileSchema = z.object({
  baseCurrencyCode: z.string().min(1, 'Выберите базовую валюту'),
  telegramUserId:   z.number().nullable().optional(),
});
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

// ━━━ GOALS ━━━

export const goalSimulationSchema = z.object({
  targetAmount:     z.number({ invalid_type_error: 'Введите цель' }).positive('Должно быть больше 0'),
  initialCapital:   z.number().nonnegative('Не может быть отрицательным').nullable().optional(),
  monthlyIncome:    z.number().nonnegative('Не может быть отрицательным').nullable().optional(),
  monthlyExpenses:  z.number().nonnegative('Не может быть отрицательным').nullable().optional(),
  annualReturnRate: z
    .number()
    .min(0, 'Минимум 0%')
    .max(100, 'Максимум 100%')
    .nullable()
    .optional(),
});
export type GoalSimulationFormValues = z.infer<typeof goalSimulationSchema>;

// ━━━ FREEDOM CALCULATOR ━━━

export const freedomCalculatorSchema = z.object({
  capital:              z.number({ invalid_type_error: 'Введите капитал' }).nonnegative('Не может быть отрицательным'),
  monthlyExpenses:      z.number({ invalid_type_error: 'Введите расходы' }).positive('Должно быть больше 0'),
  swrPercent:           z.number().min(0.1, 'Минимум 0.1%').max(20, 'Максимум 20%'),
  inflationRatePercent: z.number().min(0, 'Минимум 0%').max(50, 'Максимум 50%'),
  inflationEnabled:     z.boolean(),
});
export type FreedomCalculatorFormValues = z.infer<typeof freedomCalculatorSchema>;

// ━━━ RETROSPECTIVE ━━━

export const upsertRetrospectiveSchema = z.object({
  month:                z.string().regex(/^\d{4}-\d{2}$/, 'Формат: YYYY-MM'),
  conclusion:           z.string().max(5000).nullable().optional(),
  nextMonthPlan:        z.string().max(5000).nullable().optional(),
  wins:                 z.string().max(5000).nullable().optional(),
  savingsOpportunities: z.string().max(5000).nullable().optional(),
  disciplineRating:     z.number().min(1).max(5).nullable().optional(),
  impulseControlRating: z.number().min(1).max(5).nullable().optional(),
  confidenceRating:     z.number().min(1).max(5).nullable().optional(),
});
export type UpsertRetrospectiveFormValues = z.infer<typeof upsertRetrospectiveSchema>;
```

---

### 16. Использование в компонентах — пример паттерна

Паттерн для типичного компонента с `useQuery` и `useMutation`. Используй этот шаблон во всех data-driven компонентах:

```tsx
// Пример: хук для работы с транзакциями
// react-app/src/hooks/useTransactions.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { getTransactions, createTransaction, deleteTransaction } from '@/api/transactions';
import type { TransactionsQuery, NewTransactionPayload } from '@/types';

export function useTransactions(query: TransactionsQuery) {
  return useQuery({
    queryKey: queryKeys.transactions.list(query),
    queryFn:  () => getTransactions(query),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewTransactionPayload) => createTransaction(payload),
    onSuccess: () => {
      // Invalidate all transaction list queries and related analytics
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
```

---

### 17. Важные замечания по API

**Амплитуды (`amount`):** Бэкенд всегда хранит суммы как положительные числа. Направление определяется полем `type` (`'Income'` / `'Expense'`). При отправке всегда передавай `Math.abs(amount)`.

**Тип счёта (`AccountType`):** Бэкенд может вернуть как число (`0`, `2`, `3`, `4`), так и строку (`"Bank"`, `"Cash"`, `"Crypto"`, `"Brokerage"`, `"Deposit"`). При нормализации в фронтенд-модели приводи к числу:

```typescript
const ACCOUNT_TYPE_MAP: Record<string, number> = {
  Bank:      0,
  Cash:      0,  // Cash тоже 0 (Bank variant)
  Crypto:    2,
  Brokerage: 3,
  Deposit:   4,
};

export function normalizeAccountType(raw: AccountType | string | number): AccountType {
  if (typeof raw === 'number') return raw as AccountType;
  return (ACCOUNT_TYPE_MAP[raw] ?? 0) as AccountType;
}
```

Добавь `normalizeAccountType` в `src/utils/format.ts` или `src/utils/normalize.ts`.

**`setPrimaryAccount`:** Бэкенд ожидает raw JSON string (кавычки вокруг GUID), поэтому используем `JSON.stringify(accountId)` с явным `Content-Type: application/json`.

**Pagination:** `PagedResult<T>` — page начинается с 1. По умолчанию: `page: 1`, `size: 20`.

**Даты:** Все даты приходят и уходят в ISO 8601 (`"2025-01-15T00:00:00Z"`). Месяц ретроспектив — формат `"YYYY-MM"` (например `"2025-01"`).

---

## Constraints & Best Practices

- Нет `any` — для неизвестных структур используй `unknown` + type guard
- API-файлы — только функции, никаких классов и синглтонов (кроме уже существующего `apiClient`)
- Каждый API-файл импортирует только нужные ему типы из `@/types`
- `queryKeys` — единственный источник истины для ключей. Никогда не пиши строки-ключи inline в компонентах
- При `useMutation.onSuccess` всегда инвалидируй связанные запросы через `queryClient.invalidateQueries`
- Zod-схемы — в `src/utils/schemas.ts`, не в компонентах
- Хуки (`useQuery`/`useMutation`) — в `src/hooks/`, не inline в компонентах страниц
- Нет прямых вызовов `apiClient` из компонентов — только через хуки

---

## Cache Invalidation Matrix

После каждой мутации инвалидируй строго по таблице — не больше и не меньше:

| Мутация | Инвалидирует |
|---------|-------------|
| createTransaction / updateTransaction / deleteTransaction | `transactions.lists()`, `accounts.active()` (баланс), `analytics.dashboard()` |
| createTransfer / updateTransfer / deleteTransfer | `transactions.lists()`, `accounts.active()` (оба счёта), `analytics.dashboard()` |
| createAccount / updateAccount | `accounts.lists()` |
| deleteAccount / archiveAccount / unarchiveAccount | `accounts.lists()` |
| createBalanceAdjustment / deleteBalanceAdjustment | `accounts.adjustments(accountId)`, `accounts.active()` |
| createCategory / updateCategory | `categories.list()` |
| deleteCategory | `categories.list()`, `categories.withUsage()`, `transactions.lists()` |
| updateProfile | `currentUser()` |
| upsertRetrospective | `retrospectives.detail(month)`, `retrospectives.list()` |

Паттерн инвалидации в мутации:
```typescript
useMutation({
  mutationFn: api.transactions.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.lists() })
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts.active() })
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.dashboard() })
  },
})
```

**Важно:** `analytics.netWorth` и `analytics.evolution` инвалидировать НЕ нужно после каждой транзакции — они тяжёлые и обновляются при входе на страницу аналитики (staleTime: 60_000).

---

## Done When

- [ ] `src/types/index.ts` существует, содержит все интерфейсы с полными полями, TypeScript не даёт ошибок
- [ ] `src/api/queryKeys.ts` — все ключи описаны, нет строк-дубликатов
- [ ] Все API-файлы (`auth.ts`, `accounts.ts`, `transactions.ts`, `categories.ts`, `transfers.ts`, `analytics.ts`, `goals.ts`, `freedom.ts`, `investments.ts`, `admin.ts`, `retrospectives.ts`, `user.ts`) существуют и экспортируют функции
- [ ] `src/utils/schemas.ts` — все Zod-схемы написаны, `z.infer` типы экспортированы
- [ ] `npm run tsc --noEmit` проходит без ошибок
- [ ] Импорт любого API-модуля в компонент-заглушку не даёт ошибок компиляции
