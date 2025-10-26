import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiService } from '../services/api.service.ts';
import type { AccountDto, TransactionCategoryDto, Account, Category, Transaction, NewTransactionPayload } from '../types.ts';

export const useFinanceStore = defineStore('finance', () => {
    const accounts = ref<Account[]>([]);
    const categories = ref<Category[]>([]);
    const transactions = ref<Transaction[]>([]);
    const isLoading = ref(false);

    // Геттеры
    const primaryAccount = computed(() => {
        return accounts.value.find(a => a.isPrimary);
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
                isPrimary: index === 0,
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

    function transformTransactionFromApi(txn: Transaction): Transaction {
        return {
            ...txn,
            amount: -Math.abs(txn.amount),
            description: txn.description ?? null,
        };
    }

    return {
        accounts,
        categories,
        transactions,
        isLoading,
        primaryAccount,
        fetchInitialData,
        addExpense
    };
});
