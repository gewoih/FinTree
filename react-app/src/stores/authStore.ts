import { create } from 'zustand';
import { apiClient } from '../api/apiClient';
import { queryClient } from '@/api/queryClient';
import type {
  LoginPayload,
  RegisterPayload,
  TelegramLoginPayload,
} from '../types';
import { useUserStore } from './userStore';
import { resolveApiErrorMessage } from '../utils/errors';

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

type SetFn = (partial: Partial<AuthState>) => void;

/**
 * Shared auth flow: calls the given API method, then hydrates the user store.
 * Returns `true` on success, `false` on any error (error message is stored in state).
 */
async function authenticateAndHydrate(
  set: SetFn,
  apiCall: () => Promise<void>,
  errorFallback: string
): Promise<boolean> {
  set({ isLoading: true, error: null });

  try {
    await apiCall();
    const isHydrated = await useUserStore.getState().fetchCurrentUser(true);
    if (!isHydrated) {
      throw new Error('User hydration failed');
    }

    set({ isAuthenticated: true, isSessionChecked: true });
    return true;
  } catch (err) {
    set({ error: resolveApiErrorMessage(err, errorFallback) });
    return false;
  } finally {
    set({ isLoading: false });
  }
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isSessionChecked: false,

  login(payload) {
    return authenticateAndHydrate(
      set,
      () => apiClient.login(payload),
      'Не удалось войти. Проверьте Email и пароль.'
    );
  },

  register(payload) {
    return authenticateAndHydrate(
      set,
      () => apiClient.register(payload),
      'Не удалось зарегистрироваться. Попробуйте ещё раз.'
    );
  },

  loginWithTelegram(payload) {
    return authenticateAndHydrate(
      set,
      () => apiClient.loginWithTelegram(payload),
      'Не удалось войти через Telegram.'
    );
  },

  async logout() {
    try {
      await apiClient.logout();
    } catch {
      // Ignore logout API errors — local state is already cleared.
    } finally {
      queryClient.clear();
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
