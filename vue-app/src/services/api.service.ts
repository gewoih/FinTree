// src/services/api.service.ts
import axios, { type AxiosError } from 'axios';
import type {
    AccountDto,
    TransactionCategoryDto,
    TransactionDto,
    NewTransactionPayload,
    UpdateTransactionPayload,
    CreateAccountPayload,
    CreateCategoryPayload,
    UpdateCategoryPayload,
    Currency,
    AnalyticsDashboardDto,
    CurrentUserDto,
    UpdateUserProfilePayload,
    CreateIncomeInstrumentPayload,
    IncomeInstrumentDto,
    FutureIncomeOverviewDto,
    NetWorthSnapshotDto,
    AccountBalanceAdjustmentDto,
    CreateTransferPayload
} from '../types.ts';

/**
 * Axios client instance configured for the FinTree API
 * Base URL is proxied through Vite to https://localhost:5001
 */
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request interceptor to add JWT token to requests
 */
apiClient.interceptors.request.use(
    config => {
        const token = localStorage.getItem('fintree_jwt_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

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

        // If 401 Unauthorized, clear auth and redirect to login
        if (error.response?.status === 401) {
            localStorage.removeItem('fintree_jwt_token');
            localStorage.removeItem('fintree_user_email');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

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
        const response = await apiClient.get<TransactionDto[]>('/transaction', {
            params: accountId ? { accountId } : {},
        });
        return response.data;
    },

    async exportTransactions(): Promise<{ blob: Blob; fileName: string }> {
        const response = await apiClient.get<Blob>('/transaction/export', {
            responseType: 'blob',
        });

        const disposition = response.headers['content-disposition'] as string | undefined;
        const match = disposition?.match(/filename="?([^\";]+)"?/i);
        const fileName = match?.[1] ?? `transactions_${new Date().toISOString().slice(0, 10)}.txt`;

        return { blob: response.data, fileName };
    },

    // Создание новой транзакции
    async createTransaction(payload: NewTransactionPayload): Promise<string> {
        const transactionPayload = {
            type: payload.type,
            accountId: payload.accountId,
            categoryId: payload.categoryId,
            amount: Math.abs(payload.amount),
            occurredAt: payload.occurredAt,
            description: payload.description,
            isMandatory: payload.isMandatory ?? false,
        };
        const response = await apiClient.post<string>('/Transaction', transactionPayload);
        return response.data;
    },

    async createTransfer(payload: CreateTransferPayload): Promise<string> {
        const transferPayload = {
            fromAccountId: payload.fromAccountId,
            toAccountId: payload.toAccountId,
            fromAmount: Math.abs(payload.fromAmount),
            toAmount: Math.abs(payload.toAmount),
            occurredAt: payload.occurredAt,
            feeAmount: payload.feeAmount != null ? Math.abs(payload.feeAmount) : null,
            description: payload.description,
        };
        const response = await apiClient.post<string>('/Transaction/transfer', transferPayload);
        return response.data;
    },

    // Обновление существующей транзакции
    async updateTransaction(payload: UpdateTransactionPayload): Promise<void> {
        const updatePayload = {
            id: payload.id,
            accountId: payload.accountId,
            categoryId: payload.categoryId,
            amount: Math.abs(payload.amount),
            occurredAt: payload.occurredAt,
            description: payload.description,
            isMandatory: payload.isMandatory ?? false,
        };
        await apiClient.patch('/Transaction', updatePayload);
    },

    // Удаление транзакции (soft-delete)
    async deleteTransaction(id: string): Promise<void> {
        await apiClient.delete('/Transaction', {
            params: { id },
        });
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

    async getAccountBalanceAdjustments(accountId: string): Promise<AccountBalanceAdjustmentDto[]> {
        const response = await apiClient.get<AccountBalanceAdjustmentDto[]>(
            `/accounts/${accountId}/balance-adjustments`
        );
        return response.data;
    },

    async createAccountBalanceAdjustment(accountId: string, amount: number): Promise<string> {
        const response = await apiClient.post<string>(
            `/accounts/${accountId}/balance-adjustments`,
            { amount }
        );
        return response.data;
    },

    async deleteAccount(accountId: string): Promise<void> {
        await apiClient.delete(`/accounts/${accountId}`);
    },

    // Инвестиционные инструменты
    async getIncomeInstruments(): Promise<IncomeInstrumentDto[]> {
        const response = await apiClient.get<IncomeInstrumentDto[]>('/income-instruments');
        return response.data;
    },

    async createIncomeInstrument(payload: CreateIncomeInstrumentPayload): Promise<string> {
        const response = await apiClient.post<string>('/income-instruments', payload);
        return response.data;
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

    async getAnalyticsDashboard(year: number, month: number): Promise<AnalyticsDashboardDto> {
        const response = await apiClient.get<AnalyticsDashboardDto>('/analytics/dashboard', {
            params: { year, month }
        });
        return response.data;
    },

    async getNetWorthTrend(months?: number): Promise<NetWorthSnapshotDto[]> {
        const response = await apiClient.get<NetWorthSnapshotDto[]>('/analytics/net-worth', {
            params: months ? { months } : {},
        });
        return response.data;
    },

    async getFutureIncomeOverview(salaryMonths?: number): Promise<FutureIncomeOverviewDto> {
        const response = await apiClient.get<FutureIncomeOverviewDto>('/analytics/future-income', {
            params: salaryMonths ? { salaryMonths } : {},
        });
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
