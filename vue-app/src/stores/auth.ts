import { ref, computed, watch } from 'vue';
import { defineStore } from 'pinia';
import {
    apiService,
    type LoginPayload,
    type RegisterPayload,
    type TelegramLoginPayload
} from '../services/api.service.ts';
import { useUserStore } from './user.ts';
import { useFinanceStore } from './finance.ts';

interface ApiErrorLike {
    response?: {
        data?: {
            error?: string;
            message?: string;
        };
    };
    userMessage?: string;
}

function resolveAuthErrorMessage(err: unknown, fallback: string): string {
    if (!err || typeof err !== 'object') {
        return fallback;
    }

    const apiError = err as ApiErrorLike;
    const backendMessage = apiError.response?.data?.error ?? apiError.response?.data?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage;
    }

    if (typeof apiError.userMessage === 'string' && apiError.userMessage.trim()) {
        return apiError.userMessage;
    }

    return fallback;
}

export const useAuthStore = defineStore('auth', () => {
    const userStore = useUserStore();
    const financeStore = useFinanceStore();
    const userEmail = ref<string | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const isSessionChecked = ref(false);
    const isLoggedIn = ref(false);

    const isAuthenticated = computed(() => isSessionChecked.value && isLoggedIn.value);

    async function hydrateCurrentUser(force = false): Promise<boolean> {
        try {
            await userStore.fetchCurrentUser(force);
            const me = userStore.currentUser;
            if (!me) throw new Error('User not loaded');
            setAuthenticated(me.email);
            return true;
        } catch (err) {
            console.error('Current user hydration failed:', err);
            return false;
        }
    }

    function clearSessionState() {
        userStore.clearUserState();
        financeStore.clearFinanceState();
        isLoggedIn.value = false;
        isSessionChecked.value = true;
        userEmail.value = null;
    }

    async function login(payload: LoginPayload): Promise<boolean> {
        isLoading.value = true;
        error.value = null;

        try {
            const { email } = await apiService.login(payload);
            setAuthenticated(email);
            await hydrateCurrentUser(true);

            return true;
        } catch (err: unknown) {
            console.error('Login failed:', err);
            error.value = resolveAuthErrorMessage(err, 'Не удалось войти. Проверьте Email и пароль.');
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function register(payload: RegisterPayload): Promise<boolean> {
        isLoading.value = true;
        error.value = null;

        try {
            const { email } = await apiService.register(payload);
            setAuthenticated(email);
            await hydrateCurrentUser(true);

            return true;
        } catch (err: unknown) {
            console.error('Registration failed:', err);
            error.value = resolveAuthErrorMessage(err, 'Не удалось зарегистрироваться. Попробуйте еще раз.');
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function loginWithTelegram(payload: TelegramLoginPayload): Promise<boolean> {
        isLoading.value = true;
        error.value = null;

        try {
            const { email } = await apiService.loginWithTelegram(payload);
            setAuthenticated(email);
            await hydrateCurrentUser(true);

            return true;
        } catch (err: unknown) {
            console.error('Telegram login failed:', err);
            error.value = resolveAuthErrorMessage(err, 'Не удалось войти через Telegram.');
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function logout() {
        try {
            await apiService.logout();
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            clearSessionState();
        }
    }

    function clearError() {
        error.value = null;
    }

    async function ensureSession(): Promise<boolean> {
        if (isSessionChecked.value) {
            if (!isLoggedIn.value) return false;
            if (userStore.currentUser) {
                userEmail.value = userStore.currentUser.email;
                return true;
            }
        }

        isSessionChecked.value = true;
        const hasActiveSession = await hydrateCurrentUser(true);
        if (hasActiveSession) {
            return true;
        }

        clearSessionState();
        return false;
    }

    function setAuthenticated(email: string | null) {
        isLoggedIn.value = true;
        isSessionChecked.value = true;
        userEmail.value = email;
    }

    watch(
        () => userStore.currentUser?.id ?? null,
        (nextUserId, previousUserId) => {
            if (previousUserId && nextUserId && previousUserId !== nextUserId) {
                financeStore.clearFinanceState();
            }
        }
    );

    return {
        userEmail,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        loginWithTelegram,
        logout,
        clearError,
        ensureSession,
    };
});
