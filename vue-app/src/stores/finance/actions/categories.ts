import { apiService } from '../../../services/api.service.ts';
import type { CategoryFormPayload } from '../../../types';

interface UserSessionSnapshot {
    epoch: number;
    userId: string;
}

interface FinanceCategoryActionsContext {
    ensureWritableMode: () => boolean;
    captureUserSession: () => UserSessionSnapshot | null;
    isUserSessionCurrent: (snapshot: UserSessionSnapshot | null) => boolean;
    fetchCategories: (force?: boolean) => Promise<void>;
}

export function createFinanceCategoryActions(context: FinanceCategoryActionsContext) {
    async function createCategory(payload: CategoryFormPayload) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.createCategory({
                name: payload.name,
                color: payload.color,
                icon: payload.icon,
                categoryType: payload.categoryType,
                isMandatory: payload.isMandatory ?? false,
            });
            if (!context.isUserSessionCurrent(snapshot)) return false;

            await context.fetchCategories(true);
            return context.isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось создать категорию', error);
            return false;
        }
    }

    async function updateCategory(payload: CategoryFormPayload & { id: string }) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.updateCategory({
                id: payload.id,
                name: payload.name,
                color: payload.color,
                icon: payload.icon,
                isMandatory: payload.isMandatory ?? false,
            });
            if (!context.isUserSessionCurrent(snapshot)) return false;

            await context.fetchCategories(true);
            return context.isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось обновить категорию', error);
            return false;
        }
    }

    async function deleteCategory(categoryId: string) {
        if (!context.ensureWritableMode()) return false;
        const snapshot = context.captureUserSession();
        if (!snapshot) return false;

        try {
            await apiService.deleteCategory(categoryId);
            if (!context.isUserSessionCurrent(snapshot)) return false;
            await context.fetchCategories(true);
            return context.isUserSessionCurrent(snapshot);
        } catch (error) {
            console.error('Не удалось удалить категорию', error);
            return false;
        }
    }

    return {
        createCategory,
        updateCategory,
        deleteCategory,
    };
}
