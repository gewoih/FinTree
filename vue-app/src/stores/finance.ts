import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { apiService } from '../services/api.service.ts';
import { useUserStore } from './user';
import type {
    Account,
    AccountFormPayload,
    UpdateAccountPayload,
    Category,
    CategoryFormPayload,
    Currency,
    NewTransactionPayload,
    UpdateTransactionPayload,
    Transaction,
    CreateTransferPayload,
    UpdateTransferPayload,
    TransactionsQuery
} from '../types.ts';
import { TRANSACTION_TYPE } from '../types.ts';
import { PAGINATION_OPTIONS } from '../constants';

import {
    mapAccounts,
    mapCategories,
    mapTransactions,
    createCurrencyMap
} from '../utils/mappers';
import type { ViewState } from '../types/view-state';

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

    /**
     * Fetches available currencies from the API
     * @param force - Force refresh even if data exists
     */
    async function fetchCurrencies(force = false) {
        if (areCurrenciesLoading.value) return;
        if (currencies.value.length && !force) return;

        areCurrenciesLoading.value = true;
        try {
            const data = await apiService.getCurrencies();
            currencies.value = data;
        } catch (error) {
            console.error('Ошибка загрузки валют:', error);
            currencies.value = [];
        } finally {
            areCurrenciesLoading.value = false;
        }
    }

    /**
     * Fetches user accounts from the API
     * @param force - Force refresh even if data exists
     */
    async function fetchAccounts(force = false) {
        const snapshot = captureUserSession();
        if (!snapshot) {
            accounts.value = [];
            accountsState.value = 'idle';
            accountsError.value = null;
            accountsLoadedForUserId.value = null;
            return;
        }

        if (areAccountsLoading.value) return;
        if (accountsLoadedForUserId.value === snapshot.userId && !force) return;

        areAccountsLoading.value = true;
        accountsState.value = 'loading';
        accountsError.value = null;
        try {
            const data = await apiService.getAccounts({ archived: false });
            if (!isUserSessionCurrent(snapshot)) return;
            accounts.value = mapAccounts(data, currencyByCode.value);
            accountsState.value = accounts.value.length > 0 ? 'success' : 'empty';
            accountsLoadedForUserId.value = snapshot.userId;
        } catch (error) {
            if (!isUserSessionCurrent(snapshot)) return;
            console.error('Ошибка загрузки счетов:', error);
            accountsState.value = 'error';
            accountsError.value = resolveErrorMessage(error, 'Не удалось загрузить счета.');
            accountsLoadedForUserId.value = snapshot.userId;
        } finally {
            if (isUserSessionCurrent(snapshot)) {
                areAccountsLoading.value = false;
            }
        }
    }

    async function fetchArchivedAccounts(force = false) {
        const snapshot = captureUserSession();
        if (!snapshot) {
            archivedAccounts.value = [];
            archivedAccountsState.value = 'idle';
            archivedAccountsError.value = null;
            archivedAccountsLoadedForUserId.value = null;
            return;
        }

        if (areArchivedAccountsLoading.value) return;
        if (archivedAccountsLoadedForUserId.value === snapshot.userId && !force) return;

        areArchivedAccountsLoading.value = true;
        archivedAccountsState.value = 'loading';
        archivedAccountsError.value = null;
        try {
            const data = await apiService.getAccounts({ archived: true });
            if (!isUserSessionCurrent(snapshot)) return;
            archivedAccounts.value = mapAccounts(data, currencyByCode.value);
            archivedAccountsState.value = archivedAccounts.value.length > 0 ? 'success' : 'empty';
            archivedAccountsLoadedForUserId.value = snapshot.userId;
        } catch (error) {
            if (!isUserSessionCurrent(snapshot)) return;
            console.error('Ошибка загрузки архивных счетов:', error);
            archivedAccountsState.value = 'error';
            archivedAccountsError.value = resolveErrorMessage(error, 'Не удалось загрузить архивные счета.');
            archivedAccountsLoadedForUserId.value = snapshot.userId;
        } finally {
            if (isUserSessionCurrent(snapshot)) {
                areArchivedAccountsLoading.value = false;
            }
        }
    }

    /**
     * Fetches transaction categories from the API
     * @param force - Force refresh even if data exists
     */
    async function fetchCategories(force = false) {
        const snapshot = captureUserSession();
        if (!snapshot) {
            categories.value = [];
            categoriesState.value = 'idle';
            categoriesError.value = null;
            categoriesLoadedForUserId.value = null;
            return;
        }

        if (areCategoriesLoading.value) return;
        if (categoriesLoadedForUserId.value === snapshot.userId && !force) return;

        areCategoriesLoading.value = true;
        categoriesState.value = 'loading';
        categoriesError.value = null;
        try {
            const data = await apiService.getCategories();
            if (!isUserSessionCurrent(snapshot)) return;
            categories.value = mapCategories(data);
            categoriesState.value = categories.value.length > 0 ? 'success' : 'empty';
            categoriesLoadedForUserId.value = snapshot.userId;
        } catch (error) {
            if (!isUserSessionCurrent(snapshot)) return;
            console.error('Ошибка загрузки категорий:', error);
            categoriesState.value = 'error';
            categoriesError.value = resolveErrorMessage(error, 'Не удалось загрузить категории.');
            categoriesLoadedForUserId.value = snapshot.userId;
        } finally {
            if (isUserSessionCurrent(snapshot)) {
                areCategoriesLoading.value = false;
            }
        }
    }

    function normalizeTransactionsQuery(query: TransactionsQuery = {}): TransactionsQuery {
        const merged: TransactionsQuery = {
            ...currentTransactionsQuery.value,
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

    async function fetchTransactions(query: TransactionsQuery = {}) {
        const snapshot = captureUserSession();
        if (!snapshot) {
            resetTransactionsState();
            return;
        }

        const normalizedQuery = normalizeTransactionsQuery(query);
        const queryKey = withUserScopedDedupKey(`transactions:${JSON.stringify(normalizedQuery)}`, snapshot.userId);

        return fetchWithDedup(queryKey, async () => {
            if (!isUserSessionCurrent(snapshot)) return;
            isTransactionsLoading.value = true;
            transactionsState.value = 'loading';
            transactionsError.value = null;
            currentTransactionsQuery.value = normalizedQuery;

            try {
                const data = await apiService.getTransactions(normalizedQuery);
                if (!isUserSessionCurrent(snapshot)) return;

                if (archivedAccountsLoadedForUserId.value !== snapshot.userId) {
                    await fetchArchivedAccounts();
                }
                if (!isUserSessionCurrent(snapshot)) return;

                const accountCatalog = [...accounts.value, ...archivedAccounts.value];
                transactions.value = mapTransactions(data.items, accountCatalog, categories.value);
                transactionsPage.value = data.page;
                transactionsPageSize.value = data.size;
                transactionsTotal.value = data.total;
                transactionsState.value = data.items.length > 0 ? 'success' : 'empty';
                currentTransactionsQuery.value = {
                    ...normalizedQuery,
                    page: data.page,
                    size: data.size,
                };
            } catch (error) {
                if (!isUserSessionCurrent(snapshot)) return;
                console.error('Ошибка загрузки транзакций:', error);
                transactionsState.value = 'error';
                transactionsError.value = resolveErrorMessage(error, 'Не удалось загрузить транзакции.');
            } finally {
                if (isUserSessionCurrent(snapshot)) {
                    isTransactionsLoading.value = false;
                }
            }
        });
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

    /**
     * Creates a new transaction (expense or income)
     * @param payload - Transaction data
     * @returns Success status
     */
    async function addTransaction(payload: NewTransactionPayload) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            const transactionId = await apiService.createTransaction(payload);
            if (!isUserSessionCurrent(snapshot)) return false;

            const amount = Math.abs(Number(payload.amount));
            const isIncome = payload.type === TRANSACTION_TYPE.Income;
            const signedAmount = isIncome ? amount : -amount;
            const signedAmountInBase = applyAccountBalanceDelta(payload.accountId, signedAmount);

            const account = accounts.value.find(item => item.id === payload.accountId) ?? null;
            const category = categories.value.find(item => item.id === payload.categoryId) ?? null;
            const matchesCurrentQuery = transactionMatchesCurrentQuery(
                payload,
                account?.name ?? null,
                category?.name ?? null
            );

            if (matchesCurrentQuery) {
                transactionsTotal.value += 1;

                const isFirstPage = (currentTransactionsQuery.value.page ?? 1) === 1 && transactionsPage.value === 1;
                if (isFirstPage) {
                    const amountInBaseCurrency = signedAmountInBase == null
                        ? undefined
                        : Math.abs(signedAmountInBase);

                    appendCreatedTransactionToState({
                        id: transactionId,
                        accountId: payload.accountId,
                        categoryId: payload.categoryId,
                        amount,
                        amountInBaseCurrency,
                        originalAmount: amount,
                        originalCurrencyCode: account?.currencyCode ?? null,
                        type: payload.type,
                        occurredAt: payload.occurredAt,
                        description: payload.description ?? null,
                        isMandatory: payload.isMandatory,
                        isTransfer: false,
                        transferId: null,
                        account: account ?? undefined,
                        category,
                    });
                }
            }

            return true;
        } catch (error) {
            console.error('Ошибка при добавлении транзакции:', error);
            return false;
        }
    }

    /**
     * Creates a new transfer between accounts
     * @param payload - Transfer data
     * @returns Success status
     */
    async function createTransfer(payload: CreateTransferPayload) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.createTransfer(payload);
            if (!isUserSessionCurrent(snapshot)) return false;
            await refreshTransactionsAndBalances();
            return isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Ошибка при создании перевода:', error);
            return false;
        }
    }

    async function updateTransfer(payload: UpdateTransferPayload) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.updateTransfer(payload);
            if (!isUserSessionCurrent(snapshot)) return false;
            await refreshTransactionsAndBalances();
            return isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Ошибка при обновлении перевода:', error);
            return false;
        }
    }

    /**
     * Updates an existing transaction
     * @param payload - Updated transaction data including ID
     * @returns Success status
     */
    async function updateTransaction(payload: UpdateTransactionPayload) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.updateTransaction(payload);
            if (!isUserSessionCurrent(snapshot)) return false;
            await refreshTransactionsAndBalances();
            return isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Ошибка при обновлении транзакции:', error);
            return false;
        }
    }

    /**
     * Soft-deletes a transaction
     * @param id - Transaction ID
     * @returns Success status
     */
    async function deleteTransaction(id: string) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.deleteTransaction(id);
            if (!isUserSessionCurrent(snapshot)) return false;
            await refreshTransactionsAndBalances();
            return isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Ошибка при удалении транзакции:', error);
            return false;
        }
    }

    async function deleteTransfer(transferId: string) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.deleteTransfer(transferId);
            if (!isUserSessionCurrent(snapshot)) return false;
            await refreshTransactionsAndBalances();
            return isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Ошибка при удалении перевода:', error);
            return false;
        }
    }

    /**
     * Creates a new account
     * @param payload - Account data
     * @returns Success status
     */
    async function createAccount(payload: AccountFormPayload) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.createAccount({
                currencyCode: payload.currencyCode,
                type: payload.type,
                name: payload.name,
                initialBalance: payload.initialBalance ?? 0,
                isLiquid: payload.isLiquid ?? null,
            });
            if (!isUserSessionCurrent(snapshot)) return false;

            await fetchAccounts(true);
            return isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось создать счет', error);
            return false;
        }
    }

    /**
     * Updates an existing account
     * @param payload - Account update data
     * @returns Success status
     */
    async function updateAccount(payload: UpdateAccountPayload) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.updateAccount(payload);
            if (!isUserSessionCurrent(snapshot)) return false;
            await fetchAccounts(true);
            await fetchArchivedAccounts(true);
            return isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось обновить счет', error);
            return false;
        }
    }

    async function updateAccountLiquidity(accountId: string, isLiquid: boolean) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        const previous = accounts.value.find(acc => acc.id === accountId)?.isLiquid;
        accounts.value = accounts.value.map(acc => (
            acc.id === accountId ? { ...acc, isLiquid } : acc
        ));

        try {
            await apiService.updateAccountLiquidity(accountId, isLiquid);
            if (!isUserSessionCurrent(snapshot)) return false;
            return true;
        } catch (error) {
            console.error('Не удалось обновить ликвидность счета', error);
            if (isUserSessionCurrent(snapshot)) {
                accounts.value = accounts.value.map(acc => (
                    acc.id === accountId ? { ...acc, isLiquid: previous ?? acc.isLiquid } : acc
                ));
            }
            return false;
        }
    }

    /**
     * Sets an account as the primary/main account
     * @param accountId - ID of account to set as primary
     * @returns Success status
     */
    async function setPrimaryAccount(accountId: string) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.setPrimaryAccount(accountId);
            if (!isUserSessionCurrent(snapshot)) return false;
            accounts.value = accounts.value.map(acc => ({
                ...acc,
                isMain: acc.id === accountId,
                currency: currencyByCode.value.get(acc.currencyCode) ?? null,
            }));
            archivedAccounts.value = archivedAccounts.value.map(acc => ({
                ...acc,
                isMain: false,
                currency: currencyByCode.value.get(acc.currencyCode) ?? null,
            }));
            return true;
        } catch (error) {
            console.error('Не удалось установить основной счет', error);
            return false;
        }
    }

    async function archiveAccount(accountId: string) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.archiveAccount(accountId);
            if (!isUserSessionCurrent(snapshot)) return false;
            await Promise.all([fetchAccounts(true), fetchArchivedAccounts(true)]);
            if (!isUserSessionCurrent(snapshot)) return false;

            if (currentTransactionsQuery.value.accountId === accountId) {
                await fetchTransactions({
                    ...currentTransactionsQuery.value,
                    accountId: null,
                    page: 1,
                });
                if (!isUserSessionCurrent(snapshot)) return false;
            }

            return true;
        } catch (error) {
            console.error('Не удалось архивировать счет', error);
            return false;
        }
    }

    async function unarchiveAccount(accountId: string) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.unarchiveAccount(accountId);
            if (!isUserSessionCurrent(snapshot)) return false;
            await Promise.all([fetchAccounts(true), fetchArchivedAccounts(true)]);
            return isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось разархивировать счет', error);
            return false;
        }
    }

    async function deleteAccount(accountId: string) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.deleteAccount(accountId);
            if (!isUserSessionCurrent(snapshot)) return false;
            await Promise.all([fetchAccounts(true), fetchArchivedAccounts(true)]);
            if (!isUserSessionCurrent(snapshot)) return false;
            if (currentTransactionsQuery.value.accountId === accountId) {
                await fetchTransactions({
                    ...currentTransactionsQuery.value,
                    accountId: null,
                    page: 1,
                });
                if (!isUserSessionCurrent(snapshot)) return false;
            }
            return true;
        } catch (error) {
            console.error('Не удалось удалить счет', error);
            return false;
        }
    }

    /**
     * Creates a new transaction category
     * @param payload - Category data
     * @returns Success status
     */
    async function createCategory(payload: CategoryFormPayload) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.createCategory({
                name: payload.name,
                color: payload.color,
                icon: payload.icon,
                categoryType: payload.categoryType,
                isMandatory: payload.isMandatory ?? false,
            });
            if (!isUserSessionCurrent(snapshot)) return false;

            await fetchCategories(true);
            return isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось создать категорию', error);
            return false;
        }
    }

    /**
     * Updates an existing category
     * @param payload - Updated category data including ID
     * @returns Success status
     */
    async function updateCategory(payload: CategoryFormPayload & { id: string }) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.updateCategory({
                id: payload.id,
                name: payload.name,
                color: payload.color,
                icon: payload.icon,
                isMandatory: payload.isMandatory ?? false,
            });
            if (!isUserSessionCurrent(snapshot)) return false;

            await fetchCategories(true);
            return isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось обновить категорию', error);
            return false;
        }
    }

    /**
     * Deletes a category
     * @param categoryId - ID of category to delete
     * @returns Success status
     */
    async function deleteCategory(categoryId: string) {
        if (!ensureWritableMode()) return false;
        const snapshot = captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.deleteCategory(categoryId);
            if (!isUserSessionCurrent(snapshot)) return false;
            await fetchCategories(true);
            return isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось удалить категорию', error);
            return false;
        }
    }

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
