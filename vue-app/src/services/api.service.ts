// src/services/api.service.ts
import axios from 'axios';
import type {
    AccountDto,
    TransactionCategoryDto,
    Transaction,
    NewTransactionPayload,
    CreateAccountPayload,
    CreateCategoryPayload,
    UpdateCategoryPayload,
    Currency
} from '../types.ts';
import { TRANSACTION_TYPE } from '../types.ts';

// Используем базовый URL /api, который будет проксирован через Vite на https://localhost:5001
const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const apiService = {
    // Получение списка валют
    async getCurrencies(): Promise<Currency[]> {
        const response = await apiClient.get<Currency[]>('/currencies');
        return response.data;
    },

    // Получение счетов пользователя
    async getAccounts(): Promise<AccountDto[]> {
        const response = await apiClient.get<AccountDto[]>('/users/accounts');
        return response.data;
    },

    // Получение категорий пользователя
    async getCategories(): Promise<TransactionCategoryDto[]> {
        const response = await apiClient.get<TransactionCategoryDto[]>('/users/categories');
        return response.data;
    },

    // Получение всех транзакций по счету
    async getTransactions(accountId?: string): Promise<Transaction[]> {
        const response = await apiClient.get<Transaction[]>('/accounts/transactions', {
            params: accountId ? { accountId } : {},
        });
        return response.data;
    },

    // Создание новой транзакции (расхода)
    async createExpense(payload: NewTransactionPayload): Promise<string> {
        const expensePayload = {
            type: TRANSACTION_TYPE.Withdrawal,
            accountId: payload.accountId,
            categoryId: payload.categoryId,
            amount: Math.abs(payload.amount),
            occurredAt: payload.occurredAt,
            description: payload.description,
            isMandatory: payload.isMandatory ?? false,
        };
        const response = await apiClient.post<string>('/Transaction', expensePayload);
        return response.data;
    },

    // Работа со счетами
    async createAccount(payload: CreateAccountPayload): Promise<string> {
        const response = await apiClient.post<string>('/accounts', payload);
        return response.data;
    },

    async setPrimaryAccount(accountId: string): Promise<void> {
        await apiClient.patch('/users/main-account', JSON.stringify(accountId), {
            headers: { 'Content-Type': 'application/json' },
        });
    },

    // Работа с категориями
    async createCategory(payload: CreateCategoryPayload): Promise<string> {
        const response = await apiClient.post<string>('/TransactionCategory', payload);
        return response.data;
    },

    async updateCategory(payload: UpdateCategoryPayload): Promise<void> {
        await apiClient.patch('/TransactionCategory', payload);
    },

    async deleteCategory(id: string): Promise<void> {
        await apiClient.delete('/TransactionCategory', { params: { id } });
    },
};
