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
    name: string;
    type: AccountType;
}

export interface TransactionCategoryDto {
    id: string; // Guid
    name: string;
    color: string;
    isSystem: boolean;
}

// Extended interfaces for frontend use
export interface Account extends AccountDto {
    // Additional fields for frontend
    currency: string;
    balance: number;
    isPrimary: boolean;
}

export interface Category extends TransactionCategoryDto {
    // Additional fields for frontend
    frequency: number; // For sorting by popularity
}

export interface Transaction {
    id: string;
    accountId: string;
    categoryId: string;
    amount: number;
    occuredAt: string; // ISO дата (как возвращает API)
    description: string | null;
    isMandatory?: boolean;
    type?: TransactionType;
}

export interface NewTransactionPayload {
    accountId: string;
    categoryId: string;
    amount: number;
    occurredAt: string;
    description: string | null;
    isMandatory?: boolean;
}
