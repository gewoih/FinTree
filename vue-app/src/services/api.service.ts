// src/services/api.service.ts
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import type {
    AccountDto,
    TransactionCategoryDto,
    TransactionDto,
    NewTransactionPayload,
    UpdateTransactionPayload,
    CreateAccountPayload,
    UpdateAccountPayload,
    CreateCategoryPayload,
    UpdateCategoryPayload,
    Currency,
    AnalyticsDashboardDto,
    CurrentUserDto,
    SubscriptionPaymentDto,
    SubscriptionPlan,
    PagedResult,
    TransactionsQuery,
    UpdateUserProfilePayload,
    NetWorthSnapshotDto,
    InvestmentsOverviewDto,
    AccountBalanceAdjustmentDto,
    CreateTransferPayload,
    UpdateTransferPayload
} from '../types.ts';

type AuthRedirectConfig = AxiosRequestConfig & {
    skipAuthRedirect?: boolean;
    skipAuthRefresh?: boolean;
    _retry?: boolean;
};

/**
 * Axios client instance configured for the FinTree API
 * Base URL is proxied through Vite to https://localhost:5001
 */
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

let refreshRequest: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
    if (!refreshRequest) {
        refreshRequest = apiClient.post('/auth/refresh', null, {
            skipAuthRefresh: true,
            skipAuthRedirect: true,
        } as AuthRedirectConfig).then(() => undefined)
            .finally(() => {
                refreshRequest = null;
            });
    }

    return refreshRequest;
}

/**
 * Response interceptor for centralized error handling
 */
apiClient.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
        // Log error details for debugging
        console.error('API Error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url
        });

        const requestConfig = (error.config ?? {}) as AuthRedirectConfig;
        const requestUrl = typeof requestConfig.url === 'string' ? requestConfig.url : '';
        const isRefreshRequest = requestUrl.includes('/auth/refresh');

        // Try refresh-token flow once on 401 before redirecting user.
        if (error.response?.status === 401) {
            const shouldTryRefresh = !requestConfig.skipAuthRefresh && !requestConfig._retry && !isRefreshRequest;
            if (shouldTryRefresh) {
                requestConfig._retry = true;

                try {
                    await refreshSession();
                    return apiClient(requestConfig);
                } catch (refreshError) {
                    console.error('Session refresh failed:', refreshError);
                }
            }

            const skipAuthRedirect = requestConfig.skipAuthRedirect;
            if (!skipAuthRedirect && window.location.pathname !== '/login') {
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

    const code = (error.response.data as { code?: string } | undefined)?.code;

    switch (error.response.status) {
        case 400:
            return 'Некорректные данные. Проверьте введенную информацию.';
        case 401:
            return 'Требуется авторизация.';
        case 403:
            if (code === 'subscription_required') {
                return 'Подписка неактивна. Для изменения данных нажмите «Оплатить».';
            }
            return 'Доступ запрещен.';
        case 404:
            return 'Ресурс не найден.';
        case 409:
            return 'Операция не может быть выполнена в текущем состоянии.';
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
    async getAccounts(options: { archived?: boolean } = {}): Promise<AccountDto[]> {
        const response = await apiClient.get<AccountDto[]>('/users/accounts', {
            params: {
                archived: options.archived ?? false,
            },
        });
        return response.data;
    },

    // Получение категорий пользователя
    async getCategories(): Promise<TransactionCategoryDto[]> {
        const response = await apiClient.get<TransactionCategoryDto[]>('/users/categories');
        return response.data;
    },

    // Получение транзакций пользователя с фильтрацией и пагинацией
    async getTransactions(query: TransactionsQuery = {}): Promise<PagedResult<TransactionDto>> {
        const params: Record<string, string | number> = {};
        if (query.accountId) params.accountId = query.accountId;
        if (query.categoryId) params.categoryId = query.categoryId;
        if (query.from) params.from = query.from;
        if (query.to) params.to = query.to;
        if (query.search) params.search = query.search;
        if (query.page) params.page = query.page;
        if (query.size) params.size = query.size;

        const response = await apiClient.get<PagedResult<TransactionDto>>('/transaction', {
            params,
        });
        return response.data;
    },

    async exportTransactions(): Promise<{ blob: Blob; fileName: string }> {
        const response = await apiClient.get<Blob>('/transaction/export', {
            responseType: 'blob',
        });

        const disposition = response.headers['content-disposition'] as string | undefined;
        const match = disposition?.match(/filename="?([^";]+)"?/i);
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

    async updateTransfer(payload: UpdateTransferPayload): Promise<void> {
        const transferPayload = {
            transferId: payload.transferId,
            fromAccountId: payload.fromAccountId,
            toAccountId: payload.toAccountId,
            fromAmount: Math.abs(payload.fromAmount),
            toAmount: Math.abs(payload.toAmount),
            occurredAt: payload.occurredAt,
            feeAmount: payload.feeAmount != null ? Math.abs(payload.feeAmount) : null,
            description: payload.description,
        };
        await apiClient.patch('/Transaction/transfer', transferPayload);
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

    async deleteTransfer(transferId: string): Promise<void> {
        await apiClient.delete('/Transaction/transfer', {
            params: { transferId },
        });
    },

    // Работа со счетами
    async createAccount(payload: CreateAccountPayload): Promise<string> {
        const response = await apiClient.post<string>('/accounts', payload);
        return response.data;
    },

    async updateAccount(payload: UpdateAccountPayload): Promise<void> {
        await apiClient.patch(`/accounts/${payload.id}`, { name: payload.name });
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

    async updateAccountLiquidity(accountId: string, isLiquid: boolean): Promise<void> {
        await apiClient.patch(`/accounts/${accountId}/liquidity`, { isLiquid });
    },

    async archiveAccount(accountId: string): Promise<void> {
        await apiClient.patch(`/accounts/${accountId}/archive`);
    },

    async unarchiveAccount(accountId: string): Promise<void> {
        await apiClient.patch(`/accounts/${accountId}/unarchive`);
    },

    async deleteAccount(accountId: string): Promise<void> {
        await apiClient.delete(`/accounts/${accountId}`);
    },

    async getInvestmentsOverview(from?: string, to?: string): Promise<InvestmentsOverviewDto> {
        const response = await apiClient.get<InvestmentsOverviewDto>('/accounts/investments', {
            params: {
                ...(from ? { from } : {}),
                ...(to ? { to } : {}),
            },
        });
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

    // Текущий пользователь
    async getCurrentUser(): Promise<CurrentUserDto> {
        const response = await apiClient.get<CurrentUserDto>('/users/me', {
            skipAuthRedirect: true,
        } as AuthRedirectConfig);
        return response.data;
    },

    async skipOnboarding(): Promise<CurrentUserDto> {
        const response = await apiClient.post<CurrentUserDto>('/users/me/skip-onboarding');
        return response.data;
    },

    async updateUserProfile(payload: UpdateUserProfilePayload): Promise<CurrentUserDto> {
        const response = await apiClient.patch<CurrentUserDto>('/users/me', payload);
        return response.data;
    },

    async simulateSubscriptionPayment(plan: SubscriptionPlan): Promise<CurrentUserDto> {
        const response = await apiClient.post<CurrentUserDto>('/users/subscription/pay', { plan });
        return response.data;
    },

    async getSubscriptionPayments(): Promise<SubscriptionPaymentDto[]> {
        const response = await apiClient.get<SubscriptionPaymentDto[]>('/users/subscription/payments');
        return response.data;
    },
};
