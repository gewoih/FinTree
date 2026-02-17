import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import axios from 'axios';
import { useUserStore } from './user.ts';

interface AuthResponse {
    email: string;
    userId: string;
}

interface LoginPayload {
    email: string;
    password: string;
}

interface RegisterPayload {
    email: string;
    password: string;
    passwordConfirmation: string;
}

interface TelegramLoginPayload {
    id: number;
    auth_date: number;
    hash: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}

function resolveAuthErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError<{ error?: string }>(err)) {
        return err.response?.data?.error ?? fallback;
    }
    return fallback;
}

export const useAuthStore = defineStore('auth', () => {
    const userEmail = ref<string | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const isSessionChecked = ref(false);
    const isLoggedIn = ref(false);

    const isAuthenticated = computed(() => isSessionChecked.value && isLoggedIn.value);

    async function hydrateCurrentUser(force = false): Promise<boolean> {
        const userStore = useUserStore();
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
        const userStore = useUserStore();
        userStore.clearUserState();
        isLoggedIn.value = false;
        isSessionChecked.value = true;
        userEmail.value = null;
    }

    async function login(payload: LoginPayload): Promise<boolean> {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await axios.post<AuthResponse>('/api/auth/login', payload, {
                withCredentials: true,
            });
            const { email } = response.data;
            setAuthenticated(email);
            await hydrateCurrentUser(true);

            return true;
        } catch (err: unknown) {
            console.error('Login failed:', err);
            error.value = resolveAuthErrorMessage(err, 'Unable to sign in. Check your email and password.');
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function register(payload: RegisterPayload): Promise<boolean> {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await axios.post<AuthResponse>('/api/auth/register', payload, {
                withCredentials: true,
            });
            const { email } = response.data;
            setAuthenticated(email);
            await hydrateCurrentUser(true);

            return true;
        } catch (err: unknown) {
            console.error('Registration failed:', err);
            error.value = resolveAuthErrorMessage(err, 'Registration failed. Please try again.');
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function loginWithTelegram(payload: TelegramLoginPayload): Promise<boolean> {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await axios.post<AuthResponse>('/api/auth/telegram', payload, {
                withCredentials: true,
            });
            const { email } = response.data;
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
        const userStore = useUserStore();
        try {
            await axios.post('/api/auth/logout', null, { withCredentials: true });
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            userStore.clearUserState();
            isLoggedIn.value = false;
            isSessionChecked.value = true;
            userEmail.value = null;
        }
    }

    function clearError() {
        error.value = null;
    }

    async function ensureSession(): Promise<boolean> {
        const userStore = useUserStore();

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
