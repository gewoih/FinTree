import { create } from 'zustand';
import { apiClient } from '../api/apiClient';
import type {
  LoginPayload,
  RegisterPayload,
  TelegramLoginPayload,
} from '../types';
import { useUserStore } from './userStore';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isSessionChecked: boolean;
}

interface AuthActions {
  login(payload: LoginPayload): Promise<boolean>;
  register(payload: RegisterPayload): Promise<boolean>;
  loginWithTelegram(payload: TelegramLoginPayload): Promise<boolean>;
  logout(): Promise<void>;
  ensureSession(): Promise<boolean>;
  clearError(): void;
}

function resolveAuthErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') {
    return fallback;
  }

  const error = err as {
    response?: { data?: { error?: string; message?: string } };
    userMessage?: string;
  };

  const backendMessage = error.response?.data?.error ?? error.response?.data?.message;
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage;
  }

  if (typeof error.userMessage === 'string' && error.userMessage.trim()) {
    return error.userMessage;
  }

  return fallback;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isSessionChecked: false,

  async login(payload) {
    set({ isLoading: true, error: null });

    try {
      await apiClient.login(payload);
      const isHydrated = await useUserStore.getState().fetchCurrentUser();
      if (!isHydrated) {
        throw new Error('User hydration failed');
      }

      set({ isAuthenticated: true, isSessionChecked: true });
      return true;
    } catch (err) {
      set({
        error: resolveAuthErrorMessage(
          err,
          'Не удалось войти. Проверьте Email и пароль.'
        ),
      });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  async register(payload) {
    set({ isLoading: true, error: null });

    try {
      await apiClient.register(payload);
      const isHydrated = await useUserStore.getState().fetchCurrentUser();
      if (!isHydrated) {
        throw new Error('User hydration failed');
      }

      set({ isAuthenticated: true, isSessionChecked: true });
      return true;
    } catch (err) {
      set({
        error: resolveAuthErrorMessage(
          err,
          'Не удалось зарегистрироваться. Попробуйте ещё раз.'
        ),
      });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  async loginWithTelegram(payload) {
    set({ isLoading: true, error: null });

    try {
      await apiClient.loginWithTelegram(payload);
      const isHydrated = await useUserStore.getState().fetchCurrentUser();
      if (!isHydrated) {
        throw new Error('User hydration failed');
      }

      set({ isAuthenticated: true, isSessionChecked: true });
      return true;
    } catch (err) {
      set({
        error: resolveAuthErrorMessage(err, 'Не удалось войти через Telegram.'),
      });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  async logout() {
    try {
      await apiClient.logout();
    } catch {
      // Игнорируем ошибки logout — локальное состояние всё равно очищается.
    } finally {
      useUserStore.getState().clearUser();
      set({
        isAuthenticated: false,
        isSessionChecked: true,
        error: null,
      });
    }
  },

  async ensureSession() {
    const { isSessionChecked, isAuthenticated } = get();
    if (isSessionChecked) {
      return isAuthenticated;
    }

    try {
      const isHydrated = await useUserStore.getState().fetchCurrentUser();
      set({ isAuthenticated: isHydrated, isSessionChecked: true });
      return isHydrated;
    } catch {
      set({ isAuthenticated: false, isSessionChecked: true });
      return false;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
