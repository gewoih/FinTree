// src/types.ts

export type AccountType = 0 | 2 | 3 | 4; // 0 - Bank, 2 - Crypto, 3 - Brokerage, 4 - Deposit

export const CATEGORY_TYPE = {
    Income: 'Income',
    Expense: 'Expense',
} as const;

export type CategoryType = typeof CATEGORY_TYPE[keyof typeof CATEGORY_TYPE];

export const TRANSACTION_TYPE = {
    Income: CATEGORY_TYPE.Income,
    Expense: CATEGORY_TYPE.Expense,
} as const;

export type TransactionType = typeof TRANSACTION_TYPE[keyof typeof TRANSACTION_TYPE];

// DTOs from backend
export interface AccountDto {
    id: string; // Guid
    currencyCode: string;
    name: string;
    type: AccountType | string | number; // Backend may return string "Bank", "Cash", "Crypto" or numbers
    isLiquid: boolean;
    isArchived: boolean;
    isMain: boolean;
    balance: number;
    balanceInBaseCurrency: number;
}

export interface TransactionCategoryDto {
    id: string; // Guid
    name: string;
    color: string;
    icon: string;
    type: CategoryType;
    isMandatory?: boolean;
}

// Extended interfaces for frontend use
export interface Account extends Omit<AccountDto, 'type'> {
    type: AccountType;
    currency?: Currency | null;
}

export interface Category extends TransactionCategoryDto {
    usageCount?: number;
}

export interface Currency {
    code: string;
    name: string;
    symbol: string;
}

export interface TransactionDto {
    id: string;
    accountId: string;
    categoryId: string;
    amount: number;
    amountInBaseCurrency?: number | null;
    originalAmount?: number | null;
    originalCurrencyCode?: string | null;
    type: TransactionType | string | number;
    occurredAt: string; // ISO дата (как возвращает API)
    description: string | null;
    isMandatory: boolean;
    isTransfer?: boolean;
    transferId?: string | null;
}

export interface PagedResult<T> {
    items: T[];
    page: number;
    size: number;
    total: number;
}

export interface TransactionsQuery {
    accountId?: string | null;
    categoryId?: string | null;
    from?: string | null;
    to?: string | null;
    search?: string | null;
    page?: number;
    size?: number;
}

export interface Transaction extends Omit<TransactionDto, 'type'> {
    type: TransactionType;
    account?: Account;
    category?: Category | null;
    isTransfer?: boolean;
    transferId?: string | null;
}

export interface NewTransactionPayload {
    type: TransactionType;
    accountId: string;
    categoryId: string;
    amount: number;
    occurredAt: string;
    description: string | null;
    isMandatory: boolean;
}

export interface UpdateTransactionPayload {
    id: string;
    type: TransactionType;
    accountId: string;
    categoryId: string;
    amount: number;
    occurredAt: string;
    description: string | null;
    isMandatory: boolean;
}

export interface CreateTransferPayload {
    fromAccountId: string;
    toAccountId: string;
    fromAmount: number;
    toAmount: number;
    occurredAt: string;
    feeAmount?: number | null;
    description?: string | null;
}

export interface UpdateTransferPayload {
    transferId: string;
    fromAccountId: string;
    toAccountId: string;
    fromAmount: number;
    toAmount: number;
    occurredAt: string;
    feeAmount?: number | null;
    description?: string | null;
}

export interface CreateAccountPayload {
    currencyCode: string;
    type: AccountType;
    name: string;
    initialBalance?: number | null;
    isLiquid?: boolean | null;
}

export interface AccountFormPayload {
    name: string;
    type: AccountType;
    currencyCode: string;
    initialBalance?: number | null;
    isLiquid?: boolean | null;
}

export interface UpdateAccountPayload {
    id: string;
    name: string;
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
    meanMedianRatio: number | null;
    savingsRate: number | null;
    netCashflow: number | null;
    discretionaryTotal: number | null;
    discretionarySharePercent: number | null;
    monthOverMonthChangePercent: number | null;
    liquidAssets: number | null;
    liquidMonths: number | null;
    liquidMonthsStatus: 'good' | 'average' | 'poor' | null;
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
    id: string;
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
    forecastTotal: number | null;
    optimisticTotal: number | null;
    riskTotal: number | null;
    currentSpent: number | null;
    baselineLimit: number | null;
    status: 'good' | 'average' | 'poor' | null;
}

export interface ForecastSeriesDto {
    days: number[];
    actual: Array<number | null>;
    optimistic: Array<number | null>;
    forecast: Array<number | null>;
    risk: Array<number | null>;
    baseline: number | null;
}

export interface ForecastDto {
    summary: ForecastSummaryDto;
    series: ForecastSeriesDto;
}

export interface AnalyticsDashboardDto {
    year: number;
    month: number;
    health: FinancialHealthSummaryDto;
    peaks: PeakDaysSummaryDto;
    peakDays: PeakDayDto[];
    categories: CategoryBreakdownDto;
    spending: SpendingBreakdownDto;
    forecast: ForecastDto;
}

export interface CurrentUserDto {
    id: string;
    name: string;
    email: string | null;
    telegramUserId: number | null;
    baseCurrencyCode: string;
    subscription: SubscriptionInfoDto;
    onboardingCompleted: boolean;
    onboardingSkipped: boolean;
}

export interface SubscriptionInfoDto {
    isActive: boolean;
    isReadOnlyMode: boolean;
    expiresAtUtc: string | null;
    monthPriceRub: number;
    yearPriceRub: number;
}

export type SubscriptionPlan = 'Month' | 'Year';

export type SubscriptionPaymentStatus = 'Succeeded' | 'Failed' | 'Refunded' | 'Canceled';

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

export interface NetWorthSnapshotDto {
    year: number;
    month: number;
    netWorth: number;
}

export interface AccountBalanceAdjustmentDto {
    id: string;
    accountId: string;
    amount: number;
    occurredAt: string;
}

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
