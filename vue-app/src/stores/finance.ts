import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { apiService } from '../services/api.service.ts';
import type {
    Account,
    AccountFormPayload,
    Category,
    CategoryFormPayload,
    Currency,
    NewTransactionPayload,
    UpdateTransactionPayload,
    Transaction
} from '../types.ts';

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
    const currentTransactionsAccountId = ref<string | null>(null);

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

    /**
     * Fetches transactions, optionally filtered by account
     * @param accountId - Optional account ID to filter transactions
     */
    async function fetchTransactions(accountId?: string) {
        isTransactionsLoading.value = true;
        currentTransactionsAccountId.value = accountId ?? null;
        try {
            const data = await apiService.getTransactions(accountId);
            transactions.value = mapTransactions(data, accounts.value, categories.value);
        } catch (error) {
            console.error('Ошибка загрузки транзакций:', error);
            transactions.value = [];
        } finally {
            isTransactionsLoading.value = false;
        }
    }

    /**
     * Creates a new transaction (expense or income)
     * @param payload - Transaction data
     * @returns Success status
     */
    async function addTransaction(payload: NewTransactionPayload) {
        try {
            await apiService.createTransaction(payload);
            await fetchTransactions(currentTransactionsAccountId.value ?? undefined);
            return true;
        } catch (error) {
            console.error('Ошибка при добавлении транзакции:', error);
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
            await fetchTransactions(currentTransactionsAccountId.value ?? undefined);
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
            await fetchTransactions(currentTransactionsAccountId.value ?? undefined);
            return true;
        } catch (error) {
            console.error('Ошибка при удалении транзакции:', error);
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
            });

            await fetchAccounts(true);
            return true;
        } catch (error) {
            console.error('Не удалось создать счет', error);
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
     * System categories cannot be updated
     * @param payload - Updated category data including ID
     * @returns Success status
     */
    async function updateCategory(payload: CategoryFormPayload & { id: string }) {
        const existing = categories.value.find(cat => cat.id === payload.id);
        if (existing?.isSystem) {
            console.warn('Нельзя редактировать системную категорию');
            return false;
        }

        try {
            await apiService.updateCategory({
                id: payload.id,
                name: payload.name,
                color: payload.color,
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
     * System categories cannot be deleted
     * @param categoryId - ID of category to delete
     * @returns Success status
     */
    async function deleteCategory(categoryId: string) {
        const existing = categories.value.find(cat => cat.id === categoryId);
        if (existing?.isSystem) {
            console.warn('Нельзя удалить системную категорию');
            return false;
        }

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
        primaryAccount,
        currencyByCode,
        currentTransactionsAccountId,
        fetchTransactions,
        fetchAccounts,
        fetchCategories,
        fetchCurrencies,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        createAccount,
        setPrimaryAccount,
        createCategory,
        updateCategory,
        deleteCategory,
    };
});
