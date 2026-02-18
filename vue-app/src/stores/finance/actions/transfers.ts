import { apiService } from '../../../services/api.service.ts';
import type { CreateTransferPayload, UpdateTransferPayload } from '../../../types';

interface UserSessionSnapshot {
    epoch: number;
    userId: string;
}

interface FinanceTransferActionsContext {
    ensureWritableMode: () => boolean;
    captureUserSession: () => UserSessionSnapshot | null;
    isUserSessionCurrent: (snapshot: UserSessionSnapshot | null) => boolean;
    refreshTransactionsAndBalances: () => Promise<void>;
}

export function createFinanceTransferActions(context: FinanceTransferActionsContext) {
    async function createTransfer(payload: CreateTransferPayload) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.createTransfer(payload);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            await context.refreshTransactionsAndBalances();
            return context.isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Ошибка при создании перевода:', error);
            return false;
        }
    }

    async function updateTransfer(payload: UpdateTransferPayload) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.updateTransfer(payload);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            await context.refreshTransactionsAndBalances();
            return context.isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Ошибка при обновлении перевода:', error);
            return false;
        }
    }

    async function deleteTransfer(transferId: string) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.deleteTransfer(transferId);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            await context.refreshTransactionsAndBalances();
            return context.isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Ошибка при удалении перевода:', error);
            return false;
        }
    }

    return {
        createTransfer,
        updateTransfer,
        deleteTransfer,
    };
}
