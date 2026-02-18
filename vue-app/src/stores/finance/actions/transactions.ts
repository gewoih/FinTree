import type { Ref } from 'vue';
import { apiService } from '../../../services/api.service.ts';
import type {
    Account,
    Category,
    NewTransactionPayload,
    Transaction,
    TransactionsQuery,
    UpdateTransactionPayload,
} from '../../../types';
import { TRANSACTION_TYPE } from '../../../types';

interface UserSessionSnapshot {
    epoch: number;
    userId: string;
}

interface FinanceTransactionActionsContext {
    accounts: Ref<Account[]>;
    categories: Ref<Category[]>;
    currentTransactionsQuery: Ref<TransactionsQuery>;
    transactionsPage: Ref<number>;
    transactionsTotal: Ref<number>;
    ensureWritableMode: () => boolean;
    captureUserSession: () => UserSessionSnapshot | null;
    isUserSessionCurrent: (snapshot: UserSessionSnapshot | null) => boolean;
    refreshTransactionsAndBalances: () => Promise<void>;
    applyAccountBalanceDelta: (accountId: string, signedAmount: number) => number | null;
    transactionMatchesCurrentQuery: (
        payload: NewTransactionPayload,
        accountName: string | null,
        categoryName: string | null
    ) => boolean;
    appendCreatedTransactionToState: (transaction: Transaction) => void;
}

export function createFinanceTransactionActions(context: FinanceTransactionActionsContext) {
    async function addTransaction(payload: NewTransactionPayload) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            const transactionId = await apiService.createTransaction(payload);
            if (!context.isUserSessionCurrent(snapshot)) return false;

            const amount = Math.abs(Number(payload.amount));
            const isIncome = payload.type === TRANSACTION_TYPE.Income;
            const signedAmount = isIncome ? amount : -amount;
            const signedAmountInBase = context.applyAccountBalanceDelta(payload.accountId, signedAmount);

            const account = context.accounts.value.find(item => item.id === payload.accountId) ?? null;
            const category = context.categories.value.find(item => item.id === payload.categoryId) ?? null;
            const matchesCurrentQuery = context.transactionMatchesCurrentQuery(
                payload,
                account?.name ?? null,
                category?.name ?? null
            );

            if (matchesCurrentQuery) {
                context.transactionsTotal.value += 1;

                const isFirstPage = (context.currentTransactionsQuery.value.page ?? 1) === 1 &&
                    context.transactionsPage.value === 1;
                if (isFirstPage) {
                    const amountInBaseCurrency = signedAmountInBase == null
                        ? undefined
                        : Math.abs(signedAmountInBase);

                    context.appendCreatedTransactionToState({
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

    async function updateTransaction(payload: UpdateTransactionPayload) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.updateTransaction(payload);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            await context.refreshTransactionsAndBalances();
            return context.isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Ошибка при обновлении транзакции:', error);
            return false;
        }
    }

    async function deleteTransaction(id: string) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.deleteTransaction(id);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            await context.refreshTransactionsAndBalances();
            return context.isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Ошибка при удалении транзакции:', error);
            return false;
        }
    }

    return {
        addTransaction,
        updateTransaction,
        deleteTransaction,
    };
}
