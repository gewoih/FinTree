import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.userId);
  const email = useAuthStore((state) => state.email);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return {
    isAuthenticated,
    userId,
    email,
    setAuthenticated,
    clearAuth,
  };
}
