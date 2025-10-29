import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { apiService } from '../services/api.service.ts';
import type {
    Account,
    AccountDto,
    AccountFormPayload,
    Category,
    CategoryFormPayload,
    Currency,
    NewTransactionPayload,
    Transaction,
    TransactionCategoryDto,
    TransactionDto
} from '../types.ts';
import { CURRENT_USER_ID } from '../constants';

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

    const currencyByCode = computed(() => {
        const map = new Map<string, Currency>();
        currencies.value.forEach(currency => {
            map.set(currency.code, currency);
        });
        return map;
    });

    const primaryAccount = computed(() => accounts.value.find(a => a.isMain) ?? null);

    watch(currencies, () => {
        const map = currencyByCode.value;
        accounts.value = accounts.value.map(account => ({
            ...account,
            currency: map.get(account.currencyCode) ?? null,
        }));
    });

    function mapAccount(dto: AccountDto): Account {
        return {
            ...dto,
            currency: currencyByCode.value.get(dto.currencyCode) ?? null,
        };
    }

    function mapCategory(dto: TransactionCategoryDto): Category {
        return {
            ...dto,
        };
    }

    function mapTransaction(dto: TransactionDto): Transaction {
        const account = accounts.value.find(acc => acc.id === dto.accountId) ?? null;
        const category = categories.value.find(cat => cat.id === dto.categoryId) ?? null;

        return {
            ...dto,
            amount: Number(dto.amount),
            description: dto.description ?? null,
            account: account ?? undefined,
            category,
        };
    }

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

    async function fetchAccounts(force = false) {
        if (areAccountsLoading.value) return;
        if (accounts.value.length && !force) return;

        areAccountsLoading.value = true;
        try {
            const data = await apiService.getAccounts();
            accounts.value = data.map(mapAccount);
        } catch (error) {
            console.error('Ошибка загрузки счетов:', error);
            accounts.value = [];
        } finally {
            areAccountsLoading.value = false;
        }
    }

    async function fetchCategories(force = false) {
        if (areCategoriesLoading.value) return;
        if (categories.value.length && !force) return;

        areCategoriesLoading.value = true;
        try {
            const data = await apiService.getCategories();
            categories.value = data.map(mapCategory);
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
            categories.value = [];
        } finally {
            areCategoriesLoading.value = false;
        }
    }

    async function fetchTransactions(accountId?: string) {
        isTransactionsLoading.value = true;
        currentTransactionsAccountId.value = accountId ?? null;
        try {
            const data = await apiService.getTransactions(accountId);
            transactions.value = data.map(mapTransaction);
        } catch (error) {
            console.error('Ошибка загрузки транзакций:', error);
            transactions.value = [];
        } finally {
            isTransactionsLoading.value = false;
        }
    }

    async function addExpense(payload: NewTransactionPayload) {
        try {
            await apiService.createExpense(payload);
            await fetchTransactions(currentTransactionsAccountId.value ?? undefined);
            return true;
        } catch (error) {
            console.error('Ошибка при добавлении расхода:', error);
            return false;
        }
    }

    async function createAccount(payload: AccountFormPayload) {
        try {
            await apiService.createAccount({
                userId: CURRENT_USER_ID,
                currencyCode: payload.currencyCode,
                type: payload.type,
                name: payload.name,
            });

            await fetchAccounts(true);
            return true;
        } catch (error) {
            console.error('Не удалось создать счет', error);
            return false;
        }
    }

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

    async function createCategory(payload: CategoryFormPayload) {
        try {
            await apiService.createCategory({
                userId: CURRENT_USER_ID,
                name: payload.name,
                color: payload.color,
            });

            await fetchCategories(true);
            return true;
        } catch (error) {
            console.error('Не удалось создать категорию', error);
            return false;
        }
    }

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
            });

            await fetchCategories(true);
            return true;
        } catch (error) {
            console.error('Не удалось обновить категорию', error);
            return false;
        }
    }

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
        addExpense,
        createAccount,
        setPrimaryAccount,
        createCategory,
        updateCategory,
        deleteCategory,
    };
});
