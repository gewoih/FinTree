// src/types.ts

export type AccountType = 0 | 1 | 2; // 0 - Bank, 1 - Cash, 2 - Crypto

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
    isMain: boolean;
    balance: number;
    balanceInBaseCurrency: number;
}

export interface TransactionCategoryDto {
    id: string; // Guid
    name: string;
    color: string;
    type: CategoryType;
    isSystem: boolean;
    isMandatory?: boolean;
}

// Extended interfaces for frontend use
export interface Account extends AccountDto {
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
}

export interface Transaction extends Omit<TransactionDto, 'type'> {
    type: TransactionType;
    account?: Account;
    category?: Category | null;
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

export interface CreateAccountPayload {
    currencyCode: string;
    type: AccountType;
    name: string;
}

export interface AccountFormPayload {
    name: string;
    type: AccountType;
    currencyCode: string;
}

export interface CreateCategoryPayload {
    categoryType: CategoryType;
    name: string;
    color: string;
    isMandatory?: boolean;
}

export interface CategoryFormPayload {
    id?: string | null;
    categoryType: CategoryType;
    name: string;
    color: string;
    isMandatory?: boolean;
}

export interface UpdateCategoryPayload {
    id: string;
    name: string;
    color: string;
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
    currentSpent: number | null;
    baselineLimit: number | null;
    status: 'good' | 'average' | 'poor' | null;
}

export interface ForecastSeriesDto {
    days: number[];
    actual: Array<number | null>;
    forecast: Array<number | null>;
    baseline: Array<number | null>;
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
    telegramUsername: string | null;
    baseCurrencyCode: string;
}

export interface UpdateUserProfilePayload {
    baseCurrencyCode: string;
    telegramUsername: string;
}

export interface NetWorthSnapshotDto {
    year: number;
    month: number;
    netWorth: number;
}

export type IncomeInstrumentType = 'Salary' | 'Deposit' | 'Investment' | 'Other';

export interface IncomeInstrumentDto {
    id: string;
    name: string;
    currencyCode: string;
    type: IncomeInstrumentType | string;
    principalAmount: number;
    expectedAnnualYieldRate: number;
    monthlyContribution: number | null;
    notes: string | null;
    createdAt: string;
}

export interface CreateIncomeInstrumentPayload {
    name: string;
    currencyCode: string;
    type: IncomeInstrumentType;
    principalAmount: number;
    expectedAnnualYieldRate: number;
    monthlyContribution?: number | null;
    notes?: string | null;
}

export interface IncomeBreakdownDto {
    label: string;
    monthlyAmount: number;
    annualAmount: number;
    share: number;
}

export interface SalaryProjectionDto {
    monthlyAverage: number;
    annualProjection: number;
    sources: IncomeBreakdownDto[];
}

export interface IncomeInstrumentProjectionDto {
    id: string;
    name: string;
    type: IncomeInstrumentType | string;
    originalCurrencyCode: string;
    principalAmount: number;
    expectedAnnualYieldRate: number;
    monthlyContribution: number | null;
    expectedMonthlyIncome: number;
    expectedAnnualIncome: number;
    principalAmountInBaseCurrency: number;
    monthlyContributionInBaseCurrency: number | null;
    expectedMonthlyIncomeInBaseCurrency: number;
    expectedAnnualIncomeInBaseCurrency: number;
}

export interface FutureIncomeOverviewDto {
    baseCurrencyCode: string;
    salary: SalaryProjectionDto | null;
    instruments: IncomeInstrumentProjectionDto[];
    totalExpectedMonthlyIncome: number;
    totalExpectedAnnualIncome: number;
}
