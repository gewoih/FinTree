// src/types.ts

export type AccountType = 0 | 1; // 0 - Дебетовая карта, 1 - Наличка (примерно)

export const TRANSACTION_TYPE = {
    Deposit: 0,
    Withdrawal: 1,
    Adjustment: 2,
} as const;

export type TransactionType = typeof TRANSACTION_TYPE[keyof typeof TRANSACTION_TYPE];

// DTOs from backend
export interface AccountDto {
    id: string; // Guid
    currencyCode: string;
    name: string;
    type: AccountType;
    isMain: boolean;
}

export interface TransactionCategoryDto {
    id: string; // Guid
    name: string;
    color: string;
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
    amount: number;
    currencyCode: string;
    categoryId: string;
    occurredAt: string; // ISO дата (как возвращает API)
    description: string | null;
    isMandatory: boolean;
}

export interface Transaction extends TransactionDto {
    account?: Account;
    category?: Category | null;
}

export interface NewTransactionPayload {
    accountId: string;
    categoryId: string;
    amount: number;
    occurredAt: string;
    description: string | null;
    isMandatory: boolean;
}

export interface UpdateTransactionPayload {
    id: string;
    accountId: string;
    categoryId: string;
    amount: number;
    occurredAt: string;
    description: string | null;
    isMandatory: boolean;
}

export interface CreateAccountPayload {
    userId: string;
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
    userId: string;
    name: string;
    color: string;
}

export interface CategoryFormPayload {
    id?: string | null;
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
    amount: number;
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
