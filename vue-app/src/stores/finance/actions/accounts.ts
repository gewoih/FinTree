import type { ComputedRef, Ref } from 'vue';
import { apiService } from '../../../services/api.service.ts';
import type {
    Account,
    AccountFormPayload,
    Currency,
    TransactionsQuery,
    UpdateAccountPayload,
} from '../../../types';

interface UserSessionSnapshot {
    epoch: number;
    userId: string;
}

interface FinanceAccountActionsContext {
    accounts: Ref<Account[]>;
    archivedAccounts: Ref<Account[]>;
    currentTransactionsQuery: Ref<TransactionsQuery>;
    currencyByCode: ComputedRef<Map<string, Currency>>;
    ensureWritableMode: () => boolean;
    captureUserSession: () => UserSessionSnapshot | null;
    isUserSessionCurrent: (snapshot: UserSessionSnapshot | null) => boolean;
    fetchAccounts: (force?: boolean) => Promise<void>;
    fetchArchivedAccounts: (force?: boolean) => Promise<void>;
    fetchTransactions: (query?: TransactionsQuery) => Promise<void>;
}

export function createFinanceAccountActions(context: FinanceAccountActionsContext) {
    async function createAccount(payload: AccountFormPayload) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.createAccount({
                currencyCode: payload.currencyCode,
                type: payload.type,
                name: payload.name,
                isLiquid: payload.isLiquid ?? null,
            });
            if (!context.isUserSessionCurrent(snapshot)) return false;

            await context.fetchAccounts(true);
            return context.isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось создать счет', error);
            return false;
        }
    }

    async function updateAccount(payload: UpdateAccountPayload) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.updateAccount(payload);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            await context.fetchAccounts(true);
            await context.fetchArchivedAccounts(true);
            return context.isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось обновить счет', error);
            return false;
        }
    }

    async function updateAccountLiquidity(accountId: string, isLiquid: boolean) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        const previous = context.accounts.value.find(acc => acc.id === accountId)?.isLiquid;
        context.accounts.value = context.accounts.value.map(acc => (
            acc.id === accountId ? { ...acc, isLiquid } : acc
        ));

        try {
            await apiService.updateAccountLiquidity(accountId, isLiquid);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            return true;
        } catch (error) {
            console.error('Не удалось обновить ликвидность счета', error);
            if (context.isUserSessionCurrent(snapshot)) {
                context.accounts.value = context.accounts.value.map(acc => (
                    acc.id === accountId ? { ...acc, isLiquid: previous ?? acc.isLiquid } : acc
                ));
            }
            return false;
        }
    }

    async function setPrimaryAccount(accountId: string) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.setPrimaryAccount(accountId);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            context.accounts.value = context.accounts.value.map(acc => ({
                ...acc,
                isMain: acc.id === accountId,
                currency: context.currencyByCode.value.get(acc.currencyCode) ?? null,
            }));
            context.archivedAccounts.value = context.archivedAccounts.value.map(acc => ({
                ...acc,
                isMain: false,
                currency: context.currencyByCode.value.get(acc.currencyCode) ?? null,
            }));
            return true;
        } catch (error) {
            console.error('Не удалось установить основной счет', error);
            return false;
        }
    }

    async function archiveAccount(accountId: string) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.archiveAccount(accountId);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            await Promise.all([context.fetchAccounts(true), context.fetchArchivedAccounts(true)]);
            if (!context.isUserSessionCurrent(snapshot)) return false;

            if (context.currentTransactionsQuery.value.accountId === accountId) {
                await context.fetchTransactions({
                    ...context.currentTransactionsQuery.value,
                    accountId: null,
                    page: 1,
                });
                if (!context.isUserSessionCurrent(snapshot)) return false;
            }

            return true;
        } catch (error) {
            console.error('Не удалось архивировать счет', error);
            return false;
        }
    }

    async function unarchiveAccount(accountId: string) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.unarchiveAccount(accountId);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            await Promise.all([context.fetchAccounts(true), context.fetchArchivedAccounts(true)]);
            return context.isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось разархивировать счет', error);
            return false;
        }
    }

    async function deleteAccount(accountId: string) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.deleteAccount(accountId);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            await Promise.all([context.fetchAccounts(true), context.fetchArchivedAccounts(true)]);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            if (context.currentTransactionsQuery.value.accountId === accountId) {
                await context.fetchTransactions({
                    ...context.currentTransactionsQuery.value,
                    accountId: null,
                    page: 1,
                });
                if (!context.isUserSessionCurrent(snapshot)) return false;
            }
            return true;
        } catch (error) {
            console.error('Не удалось удалить счет', error);
            return false;
        }
    }

    return {
        createAccount,
        updateAccount,
        updateAccountLiquidity,
        setPrimaryAccount,
        archiveAccount,
        unarchiveAccount,
        deleteAccount,
    };
}
