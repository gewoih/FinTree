import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiService } from '../services/api.service.ts';
import type {
    AccountDto,
    TransactionCategoryDto,
    Account,
    Category,
    Transaction,
    NewTransactionPayload,
    AccountFormPayload,
    CategoryFormPayload
} from '../types.ts';
import { CURRENT_USER_ID, CURRENCY_CONFIG } from '../constants';

export const useFinanceStore = defineStore('finance', () => {
    const accounts = ref<Account[]>([]);
    const categories = ref<Category[]>([]);
    const transactions = ref<Transaction[]>([]);
    const isLoading = ref(false);

    // Геттеры
    const primaryAccount = computed(() => {
        return accounts.value.find(a => a.isMain);
    });

    // Действия (Actions)
    async function fetchInitialData() {
        isLoading.value = true;
        try {
            // Получаем базовые справочники
            const [rawAccs, rawCats] = await Promise.all([
                apiService.getAccounts(),
                apiService.getCategories(),
            ]);

            accounts.value = rawAccs.map((acc: AccountDto, index: number) => ({
                ...acc,
                currency: index === 0 ? 'KZT' : 'USD',
                balance: (index === 0 ? 150000 : 500),
                isMain: index === 0,
            }));

            categories.value = rawCats.map((cat: TransactionCategoryDto, index: number) => ({
                ...cat,
                frequency: rawCats.length - index,
            }));

            const targetAccountId = primaryAccount.value?.id;
            const rawTxns = await apiService.getTransactions(targetAccountId);
            transactions.value = rawTxns.map(transformTransactionFromApi);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            // Очищаем данные при ошибке API
            accounts.value = [];
            categories.value = [];
            transactions.value = [];
        } finally {
            isLoading.value = false;
        }
    }


    async function addExpense(payload: NewTransactionPayload) {
        try {
            const createdTransactionId = await apiService.createExpense(payload);
            const newTxn: Transaction = {
                id: createdTransactionId,
                accountId: payload.accountId,
                categoryId: payload.categoryId,
                amount: -Math.abs(payload.amount), // Храним расходы с отрицательным знаком для расчетов
                occuredAt: payload.occurredAt,
                description: payload.description,
                isMandatory: payload.isMandatory ?? false,
                currencyId: transactions.value[0]?.currencyId,
            };
            transactions.value.unshift(newTxn);

            // Обновляем баланс счета (имитация)
            const account = accounts.value.find(a => a.id === newTxn.accountId);
            if (account) {
                account.balance += newTxn.amount;
            }
            return true;
        } catch (error) {
            console.error('Ошибка при добавлении расхода:', error);
            return false;
        }
    }

    async function createAccount(payload: AccountFormPayload) {
        try {
            const newAccountId = await apiService.createAccount({
                userId: CURRENT_USER_ID,
                currencyId: payload.currencyId,
                type: payload.type,
                name: payload.name,
            });

            accounts.value.push({
                id: newAccountId,
                name: payload.name,
                type: payload.type,
                currency: payload.currencyCode || CURRENCY_CONFIG.default,
                balance: 0,
                isMain: false,
            });
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
            }));
            return true;
        } catch (error) {
            console.error('Не удалось установить основной счет', error);
            return false;
        }
    }

    async function createCategory(payload: CategoryFormPayload) {
        try {
            const id = await apiService.createCategory({
                userId: CURRENT_USER_ID,
                name: payload.name,
                color: payload.color,
            });

            categories.value.unshift({
                id,
                name: payload.name,
                color: payload.color,
                isSystem: false,
                frequency: categories.value.length + 1,
            });

            return true;
        } catch (error) {
            console.error('Не удалось создать категорию', error);
            return false;
        }
    }

    async function updateCategory(payload: CategoryFormPayload & { id: string }) {
        try {
            await apiService.updateCategory({
                id: payload.id,
                name: payload.name,
                color: payload.color,
            });

            categories.value = categories.value.map(cat =>
                cat.id === payload.id ? { ...cat, name: payload.name, color: payload.color } : cat
            );
            return true;
        } catch (error) {
            console.error('Не удалось обновить категорию', error);
            return false;
        }
    }

    async function deleteCategory(categoryId: string) {
        try {
            await apiService.deleteCategory(categoryId);
            categories.value = categories.value.filter(cat => cat.id !== categoryId);
            return true;
        } catch (error) {
            console.error('Не удалось удалить категорию', error);
            return false;
        }
    }

    function transformTransactionFromApi(txn: Transaction): Transaction {
        return {
            ...txn,
            amount: -Math.abs(txn.amount),
            description: txn.description ?? null,
            currencyId: txn.currencyId,
        };
    }

    return {
        accounts,
        categories,
        transactions,
        isLoading,
        primaryAccount,
        fetchInitialData,
        addExpense,
        createAccount,
        setPrimaryAccount,
        createCategory,
        updateCategory,
        deleteCategory
    };
});
