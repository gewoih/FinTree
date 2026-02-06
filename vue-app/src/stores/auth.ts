import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import axios from 'axios';
import { apiService } from '../services/api.service.ts';

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

export const useAuthStore = defineStore('auth', () => {
    const userEmail = ref<string | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const isSessionChecked = ref(false);
    const isLoggedIn = ref(false);

    const isAuthenticated = computed(() => isSessionChecked.value && isLoggedIn.value);

    async function login(payload: LoginPayload): Promise<boolean> {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await axios.post<AuthResponse>('/api/auth/login', payload, {
                withCredentials: true,
            });
            const { email } = response.data;
            setAuthenticated(email);

            return true;
        } catch (err: any) {
            console.error('Login failed:', err);
            error.value = err.response?.data?.error || 'Unable to sign in. Check your email and password.';
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

            return true;
        } catch (err: any) {
            console.error('Registration failed:', err);
            error.value = err.response?.data?.error || 'Registration failed. Please try again.';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function logout() {
        try {
            await axios.post('/api/auth/logout', null, { withCredentials: true });
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            isLoggedIn.value = false;
            isSessionChecked.value = true;
            userEmail.value = null;
        }
    }

    function clearError() {
        error.value = null;
    }

    async function ensureSession(): Promise<boolean> {
        if (isSessionChecked.value) return isLoggedIn.value;

        isSessionChecked.value = true;
        try {
            const me = await apiService.getCurrentUser();
            setAuthenticated(me.email);
            return true;
        } catch {
            isLoggedIn.value = false;
            userEmail.value = null;
            return false;
        }
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
        logout,
        clearError,
        ensureSession,
    };
});
