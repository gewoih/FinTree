import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
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
    const isLoading = ref(false);
    const isTransactionsLoading = ref(false);
    const currentTransactionsAccountId = ref<string | null>(null);

    const currencyById = computed(() => {
        const map = new Map<string, Currency>();
        currencies.value.forEach(currency => {
            if (currency.id) {
                map.set(currency.id, currency);
            }
        });
        return map;
    });

    const primaryAccount = computed(() => accounts.value.find(a => a.isMain) ?? null);

    function mapAccount(dto: AccountDto): Account {
        return {
            ...dto,
            currency: currencyById.value.get(dto.currencyId) ?? null,
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

    async function fetchCurrencies() {
        try {
            const data = await apiService.getCurrencies();
            currencies.value = data;
        } catch (error) {
            console.error('Ошибка загрузки валют:', error);
            currencies.value = [];
        }
    }

    async function fetchAccounts() {
        try {
            const data = await apiService.getAccounts();
            accounts.value = data.map(mapAccount);
        } catch (error) {
            console.error('Ошибка загрузки счетов:', error);
            accounts.value = [];
        }
    }

    async function fetchCategories() {
        try {
            const data = await apiService.getCategories();
            categories.value = data.map(mapCategory);
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
            categories.value = [];
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

    async function fetchInitialData() {
        isLoading.value = true;
        try {
            const [currenciesData, accountsData, categoriesData] = await Promise.all([
                apiService.getCurrencies(),
                apiService.getAccounts(),
                apiService.getCategories(),
            ]);

            currencies.value = currenciesData;
            accounts.value = accountsData.map(mapAccount);
            categories.value = categoriesData.map(mapCategory);

            await fetchTransactions();
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            accounts.value = [];
            categories.value = [];
            transactions.value = [];
        } finally {
            isLoading.value = false;
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
                currencyId: payload.currencyId,
                type: payload.type,
                name: payload.name,
            });

            await fetchAccounts();
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
                currency: currencyById.value.get(acc.currencyId) ?? null,
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

            await fetchCategories();
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

            await fetchCategories();
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
            await fetchCategories();
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
        isLoading,
        isTransactionsLoading,
        primaryAccount,
        currencyById,
        currentTransactionsAccountId,
        fetchInitialData,
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
