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
}

export interface TransactionCategoryDto {
    id: string; // Guid
    name: string;
    color: string;
    type: CategoryType;
    isSystem: boolean;
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
}

export interface CategoryFormPayload {
    id?: string | null;
    categoryType: CategoryType;
    name: string;
    color: string;
}

export interface UpdateCategoryPayload {
    id: string;
    name: string;
    color: string;
}

export interface MonthlyExpenseDto {
    year: number;
    month: number;
    day?: number | null;
    week?: number | null;
    amount: number;
}

export interface CategoryExpenseDto {
    id: string; // Guid from backend
    name: string;
    color: string;
    amount: number;
}

export interface NetWorthSnapshotDto {
    year: number;
    month: number;
    totalBalance: number;
}

export interface FinancialHealthMetricsDto {
    periodMonths: number;
    savingsRate: number | null;
    liquidityMonths: number | null;
    expenseVolatility: number | null;
    incomeDiversity: number | null;
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
