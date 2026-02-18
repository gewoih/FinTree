import type { ComputedRef, Ref } from 'vue';
import { apiService } from '../../../services/api.service.ts';
import { PAGINATION_OPTIONS } from '../../../constants';
import { mapAccounts, mapCategories, mapTransactions } from '../../../utils/mappers';
import type {
    Account,
    Category,
    Currency,
    TransactionsQuery,
    Transaction,
} from '../../../types';
import type { ViewState } from '../../../types/view-state';

interface UserSessionSnapshot {
    epoch: number;
    userId: string;
}

interface FinanceReadActionsContext {
    accounts: Ref<Account[]>;
    archivedAccounts: Ref<Account[]>;
    categories: Ref<Category[]>;
    currencies: Ref<Currency[]>;
    transactions: Ref<Transaction[]>;
    currentTransactionsQuery: Ref<TransactionsQuery>;
    transactionsPage: Ref<number>;
    transactionsPageSize: Ref<number>;
    transactionsTotal: Ref<number>;
    areAccountsLoading: Ref<boolean>;
    areArchivedAccountsLoading: Ref<boolean>;
    areCategoriesLoading: Ref<boolean>;
    areCurrenciesLoading: Ref<boolean>;
    isTransactionsLoading: Ref<boolean>;
    accountsState: Ref<ViewState>;
    archivedAccountsState: Ref<ViewState>;
    categoriesState: Ref<ViewState>;
    transactionsState: Ref<ViewState>;
    accountsError: Ref<string | null>;
    archivedAccountsError: Ref<string | null>;
    categoriesError: Ref<string | null>;
    transactionsError: Ref<string | null>;
    accountsLoadedForUserId: Ref<string | null>;
    archivedAccountsLoadedForUserId: Ref<string | null>;
    categoriesLoadedForUserId: Ref<string | null>;
    currencyByCode: ComputedRef<Map<string, Currency>>;
    captureUserSession: () => UserSessionSnapshot | null;
    isUserSessionCurrent: (snapshot: UserSessionSnapshot | null) => boolean;
    resolveErrorMessage: (error: unknown, fallback: string) => string;
    resetTransactionsState: () => void;
    withUserScopedDedupKey: (key: string, userId?: string | null) => string;
    fetchWithDedup: <T>(key: string, fetcher: () => Promise<T>) => Promise<T>;
}

export function createFinanceReadActions(context: FinanceReadActionsContext) {
    async function fetchCurrencies(force = false) {
        if (context.areCurrenciesLoading.value) return;
        if (context.currencies.value.length && !force) return;

        context.areCurrenciesLoading.value = true;
        try {
            const data = await apiService.getCurrencies();
            context.currencies.value = data;
        } catch (error) {
            console.error('Ошибка загрузки валют:', error);
            context.currencies.value = [];
        } finally {
            context.areCurrenciesLoading.value = false;
        }
    }

    async function fetchAccounts(force = false) {
        const snapshot = context.captureUserSession();
        if (!snapshot) {
            context.accounts.value = [];
            context.accountsState.value = 'idle';
            context.accountsError.value = null;
            context.accountsLoadedForUserId.value = null;
            return;
        }

        if (context.areAccountsLoading.value) return;
        if (context.accountsLoadedForUserId.value === snapshot.userId && !force) return;

        context.areAccountsLoading.value = true;
        context.accountsState.value = 'loading';
        context.accountsError.value = null;
        try {
            const data = await apiService.getAccounts({ archived: false });
            if (!context.isUserSessionCurrent(snapshot)) return;
            context.accounts.value = mapAccounts(data, context.currencyByCode.value);
            context.accountsState.value = context.accounts.value.length > 0 ? 'success' : 'empty';
            context.accountsLoadedForUserId.value = snapshot.userId;
        } catch (error) {
            if (!context.isUserSessionCurrent(snapshot)) return;
            console.error('Ошибка загрузки счетов:', error);
            context.accountsState.value = 'error';
            context.accountsError.value = context.resolveErrorMessage(error, 'Не удалось загрузить счета.');
            context.accountsLoadedForUserId.value = snapshot.userId;
        } finally {
            if (context.isUserSessionCurrent(snapshot)) {
                context.areAccountsLoading.value = false;
            }
        }
    }

    async function fetchArchivedAccounts(force = false) {
        const snapshot = context.captureUserSession();
        if (!snapshot) {
            context.archivedAccounts.value = [];
            context.archivedAccountsState.value = 'idle';
            context.archivedAccountsError.value = null;
            context.archivedAccountsLoadedForUserId.value = null;
            return;
        }

        if (context.areArchivedAccountsLoading.value) return;
        if (context.archivedAccountsLoadedForUserId.value === snapshot.userId && !force) return;

        context.areArchivedAccountsLoading.value = true;
        context.archivedAccountsState.value = 'loading';
        context.archivedAccountsError.value = null;
        try {
            const data = await apiService.getAccounts({ archived: true });
            if (!context.isUserSessionCurrent(snapshot)) return;
            context.archivedAccounts.value = mapAccounts(data, context.currencyByCode.value);
            context.archivedAccountsState.value = context.archivedAccounts.value.length > 0 ? 'success' : 'empty';
            context.archivedAccountsLoadedForUserId.value = snapshot.userId;
        } catch (error) {
            if (!context.isUserSessionCurrent(snapshot)) return;
            console.error('Ошибка загрузки архивных счетов:', error);
            context.archivedAccountsState.value = 'error';
            context.archivedAccountsError.value = context.resolveErrorMessage(error, 'Не удалось загрузить архивные счета.');
            context.archivedAccountsLoadedForUserId.value = snapshot.userId;
        } finally {
            if (context.isUserSessionCurrent(snapshot)) {
                context.areArchivedAccountsLoading.value = false;
            }
        }
    }

    async function fetchCategories(force = false) {
        const snapshot = context.captureUserSession();
        if (!snapshot) {
            context.categories.value = [];
            context.categoriesState.value = 'idle';
            context.categoriesError.value = null;
            context.categoriesLoadedForUserId.value = null;
            return;
        }

        if (context.areCategoriesLoading.value) return;
        if (context.categoriesLoadedForUserId.value === snapshot.userId && !force) return;

        context.areCategoriesLoading.value = true;
        context.categoriesState.value = 'loading';
        context.categoriesError.value = null;
        try {
            const data = await apiService.getCategories();
            if (!context.isUserSessionCurrent(snapshot)) return;
            context.categories.value = mapCategories(data);
            context.categoriesState.value = context.categories.value.length > 0 ? 'success' : 'empty';
            context.categoriesLoadedForUserId.value = snapshot.userId;
        } catch (error) {
            if (!context.isUserSessionCurrent(snapshot)) return;
            console.error('Ошибка загрузки категорий:', error);
            context.categoriesState.value = 'error';
            context.categoriesError.value = context.resolveErrorMessage(error, 'Не удалось загрузить категории.');
            context.categoriesLoadedForUserId.value = snapshot.userId;
        } finally {
            if (context.isUserSessionCurrent(snapshot)) {
                context.areCategoriesLoading.value = false;
            }
        }
    }

    function normalizeTransactionsQuery(query: TransactionsQuery = {}): TransactionsQuery {
        const merged: TransactionsQuery = {
            ...context.currentTransactionsQuery.value,
            ...query,
        };

        const page = Math.max(1, merged.page ?? 1);
        const size = Math.max(1, merged.size ?? PAGINATION_OPTIONS.defaultRows);
        const normalizedSearch = merged.search?.trim();

        return {
            accountId: merged.accountId ?? null,
            categoryId: merged.categoryId ?? null,
            from: merged.from ?? null,
            to: merged.to ?? null,
            search: normalizedSearch ? normalizedSearch : null,
            page,
            size,
        };
    }

    async function fetchTransactions(query: TransactionsQuery = {}) {
        const snapshot = context.captureUserSession();
        if (!snapshot) {
            context.resetTransactionsState();
            return;
        }

        const normalizedQuery = normalizeTransactionsQuery(query);
        const queryKey = context.withUserScopedDedupKey(
            `transactions:${JSON.stringify(normalizedQuery)}`,
            snapshot.userId
        );

        return context.fetchWithDedup(queryKey, async () => {
            if (!context.isUserSessionCurrent(snapshot)) return;
            context.isTransactionsLoading.value = true;
            context.transactionsState.value = 'loading';
            context.transactionsError.value = null;
            context.currentTransactionsQuery.value = normalizedQuery;

            try {
                const data = await apiService.getTransactions(normalizedQuery);
                if (!context.isUserSessionCurrent(snapshot)) return;

                if (context.archivedAccountsLoadedForUserId.value !== snapshot.userId) {
                    await fetchArchivedAccounts();
                }
                if (!context.isUserSessionCurrent(snapshot)) return;

                const accountCatalog = [...context.accounts.value, ...context.archivedAccounts.value];
                context.transactions.value = mapTransactions(data.items, accountCatalog, context.categories.value);
                context.transactionsPage.value = data.page;
                context.transactionsPageSize.value = data.size;
                context.transactionsTotal.value = data.total;
                context.transactionsState.value = data.items.length > 0 ? 'success' : 'empty';
                context.currentTransactionsQuery.value = {
                    ...normalizedQuery,
                    page: data.page,
                    size: data.size,
                };
            } catch (error) {
                if (!context.isUserSessionCurrent(snapshot)) return;
                console.error('Ошибка загрузки транзакций:', error);
                context.transactionsState.value = 'error';
                context.transactionsError.value = context.resolveErrorMessage(error, 'Не удалось загрузить транзакции.');
            } finally {
                if (context.isUserSessionCurrent(snapshot)) {
                    context.isTransactionsLoading.value = false;
                }
            }
        });
    }

    return {
        fetchAccounts,
        fetchArchivedAccounts,
        fetchCategories,
        fetchCurrencies,
        fetchTransactions,
    };
}
