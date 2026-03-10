import { useAuthStore } from '@/stores/authStore';
import { useShallow } from 'zustand/react/shallow';

export function useAuth() {
  return useAuthStore(
    useShallow((state) => ({
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      error: state.error,
      isSessionChecked: state.isSessionChecked,
      login: state.login,
      register: state.register,
      loginWithTelegram: state.loginWithTelegram,
      logout: state.logout,
      ensureSession: state.ensureSession,
      clearError: state.clearError,
    }))
  );
}
