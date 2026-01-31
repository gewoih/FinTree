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
    MonthlyExpenseDto,
    CategoryExpenseDto,
    NetWorthSnapshotDto,
    FinancialHealthMetricsDto,
    CurrentUserDto,
    UpdateUserProfilePayload,
    CreateIncomeInstrumentPayload,
    IncomeInstrumentDto,
    FutureIncomeOverviewDto
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

    // Аналитика: расходы по месяцам
    async getMonthlyExpenses(): Promise<MonthlyExpenseDto[]> {
        const response = await apiClient.get<MonthlyExpenseDto[]>('/analytics/monthly-expenses');
        return response.data;
    },

    async getExpensesByCategory(year: number, month: number): Promise<CategoryExpenseDto[]> {
        const response = await apiClient.get<CategoryExpenseDto[]>('/analytics/expenses-by-category', {
            params: { year, month }
        });
        return response.data;
    },

    async getExpensesByCategoryByDateRange(from: Date, to: Date): Promise<CategoryExpenseDto[]> {
        const response = await apiClient.get<CategoryExpenseDto[]>('/analytics/expenses-by-category-range', {
            params: {
                from: from.toISOString(),
                to: to.toISOString()
            }
        });
        return response.data;
    },

    async getExpensesByGranularity(granularity: 'days' | 'weeks' | 'months'): Promise<MonthlyExpenseDto[]> {
        const response = await apiClient.get<MonthlyExpenseDto[]>('/analytics/expenses-by-granularity', {
            params: { granularity }
        });
        return response.data;
    },

    async getNetWorthTrend(): Promise<NetWorthSnapshotDto[]> {
        const response = await apiClient.get<NetWorthSnapshotDto[]>('/analytics/networth-trend');
        return response.data;
    },

    async getFinancialHealthMetrics(periodMonths: number): Promise<FinancialHealthMetricsDto> {
        const response = await apiClient.get<FinancialHealthMetricsDto>('/analytics/financial-health', {
            params: { months: periodMonths }
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
