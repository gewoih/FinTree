import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { apiService } from '../services/api.service.ts';
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
import { PAGINATION_OPTIONS } from '../constants';

import {
    mapAccounts,
    mapCategories,
    mapTransactions,
    createCurrencyMap
} from '../utils/mappers';

export const useFinanceStore = defineStore('finance', () => {
    const accounts = ref<Account[]>([]);
    const categories = ref<Category[]>([]);
    const transactions = ref<Transaction[]>([]);
    const currencies = ref<Currency[]>([]);
    const areAccountsLoading = ref(false);
    const areCategoriesLoading = ref(false);
    const areCurrenciesLoading = ref(false);
    const isTransactionsLoading = ref(false);
    const currentTransactionsQuery = ref<TransactionsQuery>({
        accountId: null,
        categoryId: null,
        from: null,
        to: null,
        search: null,
        page: 1,
        size: PAGINATION_OPTIONS.defaultRows,
    });
    const transactionsPage = ref(1);
    const transactionsPageSize = ref(PAGINATION_OPTIONS.defaultRows);
    const transactionsTotal = ref(0);

    /**
     * Computed map of currencies indexed by code for quick lookups
     */
    const currencyByCode = computed(() => createCurrencyMap(currencies.value));

    /**
     * Computed primary/main account for the user
     */
    const primaryAccount = computed(() => accounts.value.find(a => a.isMain) ?? null);

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
        if (areAccountsLoading.value) return;
        if (accounts.value.length && !force) return;

        areAccountsLoading.value = true;
        try {
            const data = await apiService.getAccounts();
            accounts.value = mapAccounts(data, currencyByCode.value);
        } catch (error) {
            console.error('Ошибка загрузки счетов:', error);
            accounts.value = [];
        } finally {
            areAccountsLoading.value = false;
        }
    }

    /**
     * Fetches transaction categories from the API
     * @param force - Force refresh even if data exists
     */
    async function fetchCategories(force = false) {
        if (areCategoriesLoading.value) return;
        if (categories.value.length && !force) return;

        areCategoriesLoading.value = true;
        try {
            const data = await apiService.getCategories();
            categories.value = mapCategories(data);
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
            categories.value = [];
        } finally {
            areCategoriesLoading.value = false;
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

    async function fetchTransactions(query: TransactionsQuery = {}) {
        isTransactionsLoading.value = true;
        const normalizedQuery = normalizeTransactionsQuery(query);
        currentTransactionsQuery.value = normalizedQuery;

        try {
            const data = await apiService.getTransactions(normalizedQuery);
            transactions.value = mapTransactions(data.items, accounts.value, categories.value);
            transactionsPage.value = data.page;
            transactionsPageSize.value = data.size;
            transactionsTotal.value = data.total;
            currentTransactionsQuery.value = {
                ...normalizedQuery,
                page: data.page,
                size: data.size,
            };
        } catch (error) {
            console.error('Ошибка загрузки транзакций:', error);
            transactions.value = [];
            transactionsTotal.value = 0;
        } finally {
            isTransactionsLoading.value = false;
        }
    }

    async function refetchCurrentTransactions() {
        await fetchTransactions(currentTransactionsQuery.value);
    }

    /**
     * Creates a new transaction (expense or income)
     * @param payload - Transaction data
     * @returns Success status
     */
    async function addTransaction(payload: NewTransactionPayload) {
        try {
            await apiService.createTransaction(payload);
            await refetchCurrentTransactions();
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
        try {
            await apiService.createTransfer(payload);
            await refetchCurrentTransactions();
            return true;
        } catch (error) {
            console.error('Ошибка при создании перевода:', error);
            return false;
        }
    }

    async function updateTransfer(payload: UpdateTransferPayload) {
        try {
            await apiService.updateTransfer(payload);
            await refetchCurrentTransactions();
            return true;
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
        try {
            await apiService.updateTransaction(payload);
            await refetchCurrentTransactions();
            return true;
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
        try {
            await apiService.deleteTransaction(id);
            await refetchCurrentTransactions();
            return true;
        } catch (error) {
            console.error('Ошибка при удалении транзакции:', error);
            return false;
        }
    }

    async function deleteTransfer(transferId: string) {
        try {
            await apiService.deleteTransfer(transferId);
            await refetchCurrentTransactions();
            return true;
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
        try {
            await apiService.createAccount({
                currencyCode: payload.currencyCode,
                type: payload.type,
                name: payload.name,
                initialBalance: payload.initialBalance ?? 0,
                isLiquid: payload.isLiquid ?? null,
            });

            await fetchAccounts(true);
            return true;
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
        try {
            await apiService.updateAccount(payload);
            await fetchAccounts(true);
            return true;
        } catch (error) {
            console.error('Не удалось обновить счет', error);
            return false;
        }
    }

    async function updateAccountLiquidity(accountId: string, isLiquid: boolean) {
        const previous = accounts.value.find(acc => acc.id === accountId)?.isLiquid;
        accounts.value = accounts.value.map(acc => (
            acc.id === accountId ? { ...acc, isLiquid } : acc
        ));

        try {
            await apiService.updateAccountLiquidity(accountId, isLiquid);
            return true;
        } catch (error) {
            console.error('Не удалось обновить ликвидность счета', error);
            accounts.value = accounts.value.map(acc => (
                acc.id === accountId ? { ...acc, isLiquid: previous ?? acc.isLiquid } : acc
            ));
            return false;
        }
    }

    /**
     * Sets an account as the primary/main account
     * @param accountId - ID of account to set as primary
     * @returns Success status
     */
    async function setPrimaryAccount(accountId: string) {
        try {
            await apiService.setPrimaryAccount(accountId);
            accounts.value = accounts.value.map(acc => ({
                ...acc,
                isMain: acc.id === accountId,
                currency: currencyByCode.value.get(acc.currencyCode) ?? null,
            }));
            return true;
        } catch (error) {
            console.error('Не удалось установить основной счет', error);
            return false;
        }
    }

    async function deleteAccount(accountId: string) {
        try {
            await apiService.deleteAccount(accountId);
            await fetchAccounts(true);
            if (currentTransactionsQuery.value.accountId === accountId) {
                await fetchTransactions({
                    ...currentTransactionsQuery.value,
                    accountId: null,
                    page: 1,
                });
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
        try {
            await apiService.createCategory({
                name: payload.name,
                color: payload.color,
                icon: payload.icon,
                categoryType: payload.categoryType,
                isMandatory: payload.isMandatory ?? false,
            });

            await fetchCategories(true);
            return true;
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
        try {
            await apiService.updateCategory({
                id: payload.id,
                name: payload.name,
                color: payload.color,
                icon: payload.icon,
                isMandatory: payload.isMandatory ?? false,
            });

            await fetchCategories(true);
            return true;
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
        try {
            await apiService.deleteCategory(categoryId);
            await fetchCategories(true);
            return true;
        } catch (error) {
            console.error('Не удалось удалить категорию', error);
            return false;
        }
    }

    return {
        accounts,
        categories,
        transactions,
        currencies,
        areAccountsLoading,
        areCategoriesLoading,
        areCurrenciesLoading,
        isTransactionsLoading,
        currentTransactionsQuery,
        transactionsPage,
        transactionsPageSize,
        transactionsTotal,
        primaryAccount,
        currencyByCode,
        fetchTransactions,
        fetchAccounts,
        fetchCategories,
        fetchCurrencies,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        deleteTransfer,
        createTransfer,
        updateTransfer,
        createAccount,
        updateAccount,
        setPrimaryAccount,
        deleteAccount,
        updateAccountLiquidity,
        createCategory,
        updateCategory,
        deleteCategory,
    };
});
