import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { apiService } from '../services/api.service.ts';
import type { CurrentUserDto, UpdateUserProfilePayload } from '../types.ts';

export const useUserStore = defineStore('user', () => {
    const currentUser = ref<CurrentUserDto | null>(null);
    const isLoading = ref(false);
    const isSaving = ref(false);

    const baseCurrencyCode = computed(() => currentUser.value?.baseCurrencyCode ?? null);

    async function fetchCurrentUser(force = false) {
        if (isLoading.value) return;
        if (currentUser.value && !force) return;

        isLoading.value = true;
        try {
            const data = await apiService.getCurrentUser();
            currentUser.value = data;
        } catch (error) {
            console.error('Не удалось загрузить данные пользователя:', error);
            currentUser.value = null;
        } finally {
            isLoading.value = false;
        }
    }

    async function saveProfileSettings(payload: UpdateUserProfilePayload) {
        if (isSaving.value) return false;

        isSaving.value = true;
        try {
            const updatedUser = await apiService.updateUserProfile(payload);
            currentUser.value = updatedUser;
            return true;
        } catch (error) {
            console.error('Не удалось обновить профиль пользователя:', error);
            return false;
        } finally {
            isSaving.value = false;
        }
    }

    return {
        currentUser,
        baseCurrencyCode,
        isLoading,
        isSaving,
        fetchCurrentUser,
        saveProfileSettings,
    };
});
