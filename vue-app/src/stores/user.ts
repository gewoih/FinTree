import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { apiService } from '../services/api.service.ts';
import type {
    CurrentUserDto,
    SubscriptionPaymentDto,
    SubscriptionPlan,
    UpdateUserProfilePayload
} from '../types.ts';

export const useUserStore = defineStore('user', () => {
    const currentUser = ref<CurrentUserDto | null>(null);
    const isLoading = ref(false);
    const isSaving = ref(false);
    const isSubscriptionProcessing = ref(false);
    const subscriptionPayments = ref<SubscriptionPaymentDto[]>([]);
    const areSubscriptionPaymentsLoading = ref(false);
    const hasSubscriptionPaymentsLoaded = ref(false);

    const baseCurrencyCode = computed(() => currentUser.value?.baseCurrencyCode ?? null);
    const subscription = computed(() => currentUser.value?.subscription ?? null);
    const isReadOnlyMode = computed(() => subscription.value?.isReadOnlyMode ?? false);
    const hasActiveSubscription = computed(() => subscription.value?.isActive ?? false);

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
            subscriptionPayments.value = [];
            hasSubscriptionPaymentsLoaded.value = false;
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

    async function simulateSubscriptionPayment(plan: SubscriptionPlan) {
        if (isSubscriptionProcessing.value) return false;

        isSubscriptionProcessing.value = true;
        try {
            const updatedUser = await apiService.simulateSubscriptionPayment(plan);
            currentUser.value = updatedUser;
            await fetchSubscriptionPayments(true);
            return true;
        } catch (error) {
            console.error('Не удалось оформить подписку:', error);
            return false;
        } finally {
            isSubscriptionProcessing.value = false;
        }
    }

    async function fetchSubscriptionPayments(force = false) {
        if (areSubscriptionPaymentsLoading.value) return;
        if (hasSubscriptionPaymentsLoaded.value && !force) return;

        areSubscriptionPaymentsLoading.value = true;
        try {
            const data = await apiService.getSubscriptionPayments();
            subscriptionPayments.value = data;
            hasSubscriptionPaymentsLoaded.value = true;
        } catch (error) {
            console.error('Не удалось загрузить историю подписок:', error);
            if (!hasSubscriptionPaymentsLoaded.value) {
                subscriptionPayments.value = [];
            }
        } finally {
            areSubscriptionPaymentsLoading.value = false;
        }
    }

    return {
        currentUser,
        subscriptionPayments,
        baseCurrencyCode,
        subscription,
        isReadOnlyMode,
        hasActiveSubscription,
        isLoading,
        isSaving,
        isSubscriptionProcessing,
        areSubscriptionPaymentsLoading,
        fetchCurrentUser,
        fetchSubscriptionPayments,
        saveProfileSettings,
        simulateSubscriptionPayment,
    };
});
