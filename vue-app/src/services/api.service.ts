// src/services/api.service.ts
import axios, { type AxiosError } from 'axios';
import type {
    AccountDto,
    TransactionCategoryDto,
    TransactionDto,
    NewTransactionPayload,
    CreateAccountPayload,
    CreateCategoryPayload,
    UpdateCategoryPayload,
    Currency,
    MonthlyExpenseDto,
    CurrentUserDto,
    UpdateUserProfilePayload
} from '../types.ts';
import { TRANSACTION_TYPE } from '../types.ts';

/**
 * Axios client instance configured for the FinTree API
 * Base URL is proxied through Vite to https://localhost:5001
 */
const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Response interceptor for centralized error handling
 */
apiClient.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
        // Log error details for debugging
        console.error('API Error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url
        });

        // Enhance error object with user-friendly message
        const enhancedError = {
            ...error,
            userMessage: getUserFriendlyErrorMessage(error)
        };

        return Promise.reject(enhancedError);
    }
);

/**
 * Converts technical API errors into user-friendly messages
 */
function getUserFriendlyErrorMessage(error: AxiosError): string {
    if (!error.response) {
        return 'Не удалось подключиться к серверу. Проверьте интернет-соединение.';
    }

    switch (error.response.status) {
        case 400:
            return 'Некорректные данные. Проверьте введенную информацию.';
        case 401:
            return 'Требуется авторизация.';
        case 403:
            return 'Доступ запрещен.';
        case 404:
            return 'Ресурс не найден.';
        case 500:
            return 'Ошибка сервера. Попробуйте позже.';
        case 503:
            return 'Сервис временно недоступен.';
        default:
            return 'Произошла ошибка при выполнении запроса.';
    }
}

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
    async getTransactions(accountId?: string): Promise<TransactionDto[]> {
        const response = await apiClient.get<TransactionDto[]>('/accounts/transactions', {
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

    // Аналитика: расходы по месяцам
    async getMonthlyExpenses(): Promise<MonthlyExpenseDto[]> {
        const response = await apiClient.get<MonthlyExpenseDto[]>('/analytics/monthly-expenses');
        return response.data;
    },

    // Текущий пользователь
    async getCurrentUser(): Promise<CurrentUserDto> {
        const response = await apiClient.get<CurrentUserDto>('/users/me');
        return response.data;
    },

    async updateUserProfile(payload: UpdateUserProfilePayload): Promise<CurrentUserDto> {
        const response = await apiClient.patch<CurrentUserDto>('/users/me', payload);
        return response.data;
    },
};
