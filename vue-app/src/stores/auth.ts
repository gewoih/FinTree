import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import axios from 'axios';

interface AuthResponse {
    token: string;
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

const TOKEN_KEY = 'fintree_jwt_token';
const USER_EMAIL_KEY = 'fintree_user_email';

export const useAuthStore = defineStore('auth', () => {
    const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
    const userEmail = ref<string | null>(localStorage.getItem(USER_EMAIL_KEY));
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const isAuthenticated = computed(() => !!token.value);

    async function login(payload: LoginPayload): Promise<boolean> {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await axios.post<AuthResponse>('/api/auth/login', payload);
            const { token: jwtToken, email } = response.data;

            token.value = jwtToken;
            userEmail.value = email;

            localStorage.setItem(TOKEN_KEY, jwtToken);
            localStorage.setItem(USER_EMAIL_KEY, email);

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
            const response = await axios.post<AuthResponse>('/api/auth/register', payload);
            const { token: jwtToken, email } = response.data;

            token.value = jwtToken;
            userEmail.value = email;

            localStorage.setItem(TOKEN_KEY, jwtToken);
            localStorage.setItem(USER_EMAIL_KEY, email);

            return true;
        } catch (err: any) {
            console.error('Registration failed:', err);
            error.value = err.response?.data?.error || 'Registration failed. Please try again.';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    function logout() {
        token.value = null;
        userEmail.value = null;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_EMAIL_KEY);
    }

    function clearError() {
        error.value = null;
    }

    // Initialize auth state from localStorage on app start
    function initAuth() {
        token.value = localStorage.getItem(TOKEN_KEY);
        userEmail.value = localStorage.getItem(USER_EMAIL_KEY);
    }

    return {
        token,
        userEmail,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
        initAuth,
    };
});
