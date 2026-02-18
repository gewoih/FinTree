import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useUserStore } from './user';
import type {
    Account,
    Category,
    Currency,
    NewTransactionPayload,
    Transaction,
    TransactionsQuery
} from '../types.ts';
import { PAGINATION_OPTIONS } from '../constants';

import {
    mapAccounts,
    createCurrencyMap
} from '../utils/mappers';
import type { ViewState } from '../types/view-state';
import { createFinanceAccountActions } from './finance/actions/accounts';
import { createFinanceCategoryActions } from './finance/actions/categories';
import { createFinanceTransactionActions } from './finance/actions/transactions';
import { createFinanceTransferActions } from './finance/actions/transfers';
import { createFinanceReadActions } from './finance/actions/read';

export const useFinanceStore = defineStore('finance', () => {
    const userStore = useUserStore();
    const accounts = ref<Account[]>([]);
    const archivedAccounts = ref<Account[]>([]);
    const categories = ref<Category[]>([]);
    const transactions = ref<Transaction[]>([]);
    const currencies = ref<Currency[]>([]);
    const areAccountsLoading = ref(false);
    const areArchivedAccountsLoading = ref(false);
    const areCategoriesLoading = ref(false);
    const areCurrenciesLoading = ref(false);
    const isTransactionsLoading = ref(false);
    const accountsState = ref<ViewState>('idle');
    const archivedAccountsState = ref<ViewState>('idle');
    const categoriesState = ref<ViewState>('idle');
    const transactionsState = ref<ViewState>('idle');
    const accountsError = ref<string | null>(null);
    const archivedAccountsError = ref<string | null>(null);
    const categoriesError = ref<string | null>(null);
    const transactionsError = ref<string | null>(null);
    const accountsLoadedForUserId = ref<string | null>(null);
    const archivedAccountsLoadedForUserId = ref<string | null>(null);
    const categoriesLoadedForUserId = ref<string | null>(null);
    const financeSessionEpoch = ref(0);

    interface UserSessionSnapshot {
        epoch: number;
        userId: string;
    }

    const currentUserId = computed(() => userStore.currentUser?.id ?? null);

    /**
     * Request deduplication: prevents same query from firing twice on rapid clicks
     */
    const pendingRequests = new Map<string, Promise<unknown>>();

    function resolveErrorMessage(error: unknown, fallback: string): string {
        if (typeof error === 'object' && error && 'userMessage' in error) {
            const message = (error as { userMessage?: string }).userMessage;
            if (typeof message === 'string' && message.trim().length > 0) {
                return message;
            }
        }

        if (error instanceof Error && error.message.trim().length > 0) {
            return error.message;
        }

        return fallback;
    }

    async function fetchWithDedup<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
        if (pendingRequests.has(key)) {
            return pendingRequests.get(key) as Promise<T>;
        }
        const promise = fetcher().finally(() => pendingRequests.delete(key));
        pendingRequests.set(key, promise);
        return promise;
    }

    function createDefaultTransactionsQuery(): TransactionsQuery {
        return {
            accountId: null,
            categoryId: null,
            from: null,
            to: null,
            search: null,
            page: 1,
            size: PAGINATION_OPTIONS.defaultRows,
        };
    }

    const currentTransactionsQuery = ref<TransactionsQuery>(createDefaultTransactionsQuery());
    const transactionsPage = ref(1);
    const transactionsPageSize = ref<number>(PAGINATION_OPTIONS.defaultRows);
    const transactionsTotal = ref(0);

    /**
     * Computed map of currencies indexed by code for quick lookups
     */
    const currencyByCode = computed(() => createCurrencyMap(currencies.value));

    /**
     * Computed primary/main account for the user
     */
    const primaryAccount = computed(() => accounts.value.find(a => a.isMain) ?? null);
    const isReadOnlyMode = computed(() => userStore.currentUser?.subscription?.isReadOnlyMode ?? false);
    const areAccountsReady = computed(() => {
        const userId = currentUserId.value;
        return Boolean(userId) && accountsLoadedForUserId.value === userId;
    });
    const areArchivedAccountsReady = computed(() => {
        const userId = currentUserId.value;
        return Boolean(userId) && archivedAccountsLoadedForUserId.value === userId;
    });
    const areCategoriesReady = computed(() => {
        const userId = currentUserId.value;
        return Boolean(userId) && categoriesLoadedForUserId.value === userId;
    });

    function ensureWritableMode(): boolean {
        if (!isReadOnlyMode.value) return true;
        console.warn('Операция записи заблокирована: подписка неактивна.');
        return false;
    }

    function captureUserSession(): UserSessionSnapshot | null {
        const userId = currentUserId.value;
        if (!userId) return null;
        return {
            epoch: financeSessionEpoch.value,
            userId,
        };
    }

    function isUserSessionCurrent(snapshot: UserSessionSnapshot | null): snapshot is UserSessionSnapshot {
        return snapshot != null &&
            snapshot.epoch === financeSessionEpoch.value &&
            snapshot.userId === currentUserId.value;
    }

    function withUserScopedDedupKey(key: string, userId: string | null = currentUserId.value): string {
        return `${userId ?? 'anonymous'}:${key}`;
    }

    function resetTransactionsState() {
        transactions.value = [];
        currentTransactionsQuery.value = createDefaultTransactionsQuery();
        transactionsPage.value = 1;
        transactionsPageSize.value = PAGINATION_OPTIONS.defaultRows;
        transactionsTotal.value = 0;
        isTransactionsLoading.value = false;
        transactionsState.value = 'idle';
        transactionsError.value = null;
    }

    function clearFinanceState() {
        financeSessionEpoch.value += 1;
        pendingRequests.clear();

        accounts.value = [];
        archivedAccounts.value = [];
        categories.value = [];
        areAccountsLoading.value = false;
        areArchivedAccountsLoading.value = false;
        areCategoriesLoading.value = false;
        accountsState.value = 'idle';
        archivedAccountsState.value = 'idle';
        categoriesState.value = 'idle';
        accountsError.value = null;
        archivedAccountsError.value = null;
        categoriesError.value = null;
        accountsLoadedForUserId.value = null;
        archivedAccountsLoadedForUserId.value = null;
        categoriesLoadedForUserId.value = null;

        resetTransactionsState();
    }

    /**
     * Watch for currency updates and re-enrich accounts with currency data
     */
    watch(currencies, () => {
        const map = currencyByCode.value;
        accounts.value = mapAccounts(
            accounts.value.map(acc => ({
                id: acc.id,
                currencyCode: acc.currencyCode,
                name: acc.name,
                type: acc.type,
                isLiquid: acc.isLiquid ?? false,
                isArchived: acc.isArchived ?? false,
                isMain: acc.isMain,
                balance: acc.balance ?? 0,
                balanceInBaseCurrency: acc.balanceInBaseCurrency ?? acc.balance ?? 0
            })),
            map
        );

        archivedAccounts.value = mapAccounts(
            archivedAccounts.value.map(acc => ({
                id: acc.id,
                currencyCode: acc.currencyCode,
                name: acc.name,
                type: acc.type,
                isLiquid: acc.isLiquid ?? false,
                isArchived: acc.isArchived ?? true,
                isMain: acc.isMain,
                balance: acc.balance ?? 0,
                balanceInBaseCurrency: acc.balanceInBaseCurrency ?? acc.balance ?? 0
            })),
            map
        );
    });

    const readActions = createFinanceReadActions({
        accounts,
        archivedAccounts,
        categories,
        currencies,
        transactions,
        currentTransactionsQuery,
        transactionsPage,
        transactionsPageSize,
        transactionsTotal,
        areAccountsLoading,
        areArchivedAccountsLoading,
        areCategoriesLoading,
        areCurrenciesLoading,
        isTransactionsLoading,
        accountsState,
        archivedAccountsState,
        categoriesState,
        transactionsState,
        accountsError,
        archivedAccountsError,
        categoriesError,
        transactionsError,
        accountsLoadedForUserId,
        archivedAccountsLoadedForUserId,
        categoriesLoadedForUserId,
        currencyByCode,
        captureUserSession,
        isUserSessionCurrent,
        resolveErrorMessage,
        resetTransactionsState,
        withUserScopedDedupKey,
        fetchWithDedup,
    });

    const {
        fetchAccounts,
        fetchArchivedAccounts,
        fetchCategories,
        fetchCurrencies,
        fetchTransactions,
    } = readActions;

    function toUtcDateOnlyKey(value: string): string | null {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        const year = parsed.getUTCFullYear();
        const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0');
        const day = `${parsed.getUTCDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function inferBaseRate(account: Account): number | null {
        const baseCurrencyCode = userStore.baseCurrencyCode;
        if (baseCurrencyCode && account.currencyCode === baseCurrencyCode) return 1;

        const balance = Number(account.balance ?? 0);
        const balanceInBase = Number(account.balanceInBaseCurrency ?? account.balance ?? 0);
        if (Math.abs(balance) < 0.000001) return null;

        const rawRate = Math.abs(balanceInBase / balance);
        return Number.isFinite(rawRate) && rawRate > 0 ? rawRate : null;
    }

    function applyAccountBalanceDelta(accountId: string, signedAmount: number): number | null {
        const target = accounts.value.find(account => account.id === accountId);
        if (!target) return null;

        const rate = inferBaseRate(target);
        const signedAmountInBase = rate == null ? null : signedAmount * rate;

        accounts.value = accounts.value.map(account => {
            if (account.id !== accountId) return account;

            const nextBalance = Number(account.balance ?? 0) + signedAmount;
            const currentBalanceInBase = Number(account.balanceInBaseCurrency ?? account.balance ?? 0);
            const nextBalanceInBase = signedAmountInBase == null
                ? currentBalanceInBase
                : currentBalanceInBase + signedAmountInBase;

            return {
                ...account,
                balance: nextBalance,
                balanceInBaseCurrency: nextBalanceInBase,
            };
        });

        return signedAmountInBase;
    }

    function transactionMatchesCurrentQuery(
        payload: NewTransactionPayload,
        accountName: string | null,
        categoryName: string | null
    ): boolean {
        const query = currentTransactionsQuery.value;
        if (query.accountId && query.accountId !== payload.accountId) return false;
        if (query.categoryId && query.categoryId !== payload.categoryId) return false;

        const txDateKey = toUtcDateOnlyKey(payload.occurredAt);
        if (!txDateKey) return false;
        if (query.from && txDateKey < query.from) return false;
        if (query.to && txDateKey > query.to) return false;

        const search = query.search?.trim().toLowerCase();
        if (search) {
            const description = (payload.description ?? '').toLowerCase();
            const account = (accountName ?? '').toLowerCase();
            const category = (categoryName ?? '').toLowerCase();
            if (!description.includes(search) && !account.includes(search) && !category.includes(search)) {
                return false;
            }
        }

        return true;
    }

    function appendCreatedTransactionToState(transaction: Transaction) {
        const pageSize = transactionsPageSize.value || PAGINATION_OPTIONS.defaultRows;
        const next = [transaction, ...transactions.value]
            .sort((a, b) => {
                const timeDiff = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
                if (timeDiff !== 0) return timeDiff;
                return b.id.localeCompare(a.id);
            })
            .slice(0, pageSize);

        transactions.value = next;
    }

    async function refetchCurrentTransactions() {
        await fetchTransactions(currentTransactionsQuery.value);
    }

    async function refreshTransactionsAndBalances() {
        await Promise.all([
            refetchCurrentTransactions(),
            fetchAccounts(true),
        ]);
    }

    const transactionActions = createFinanceTransactionActions({
        accounts,
        categories,
        currentTransactionsQuery,
        transactionsPage,
        transactionsTotal,
        ensureWritableMode,
        captureUserSession,
        isUserSessionCurrent,
        refreshTransactionsAndBalances,
        applyAccountBalanceDelta,
        transactionMatchesCurrentQuery,
        appendCreatedTransactionToState,
    });

    const transferActions = createFinanceTransferActions({
        ensureWritableMode,
        captureUserSession,
        isUserSessionCurrent,
        refreshTransactionsAndBalances,
    });

    const accountActions = createFinanceAccountActions({
        accounts,
        archivedAccounts,
        currentTransactionsQuery,
        currencyByCode,
        ensureWritableMode,
        captureUserSession,
        isUserSessionCurrent,
        fetchAccounts,
        fetchArchivedAccounts,
        fetchTransactions,
    });

    const categoryActions = createFinanceCategoryActions({
        ensureWritableMode,
        captureUserSession,
        isUserSessionCurrent,
        fetchCategories,
    });

    const { addTransaction, updateTransaction, deleteTransaction } = transactionActions;
    const { createTransfer, updateTransfer, deleteTransfer } = transferActions;
    const {
        createAccount,
        updateAccount,
        updateAccountLiquidity,
        setPrimaryAccount,
        archiveAccount,
        unarchiveAccount,
        deleteAccount,
    } = accountActions;
    const { createCategory, updateCategory, deleteCategory } = categoryActions;

    return {
        accounts,
        archivedAccounts,
        categories,
        transactions,
        currencies,
        areAccountsLoading,
        areArchivedAccountsLoading,
        areCategoriesLoading,
        areCurrenciesLoading,
        isTransactionsLoading,
        accountsState,
        archivedAccountsState,
        categoriesState,
        transactionsState,
        accountsError,
        archivedAccountsError,
        categoriesError,
        transactionsError,
        areAccountsReady,
        areArchivedAccountsReady,
        areCategoriesReady,
        accountsLoadedForUserId,
        archivedAccountsLoadedForUserId,
        categoriesLoadedForUserId,
        currentTransactionsQuery,
        transactionsPage,
        transactionsPageSize,
        transactionsTotal,
        primaryAccount,
        currencyByCode,
        fetchTransactions,
        fetchAccounts,
        fetchArchivedAccounts,
        fetchCategories,
        fetchCurrencies,
        clearFinanceState,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        deleteTransfer,
        createTransfer,
        updateTransfer,
        createAccount,
        updateAccount,
        setPrimaryAccount,
        archiveAccount,
        unarchiveAccount,
        deleteAccount,
        updateAccountLiquidity,
        createCategory,
        updateCategory,
        deleteCategory,
    };
});
