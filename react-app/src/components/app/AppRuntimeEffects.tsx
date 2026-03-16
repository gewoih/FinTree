import { useEffect } from 'react';
import { AUTH_EXPIRED_EVENT } from '@/api';
import { queryClient } from '@/api/queryClient';
import { PATHS } from '@/router/paths';
import { router } from '@/router';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';

export function AppRuntimeEffects() {
  useEffect(() => {
    const handleAuthExpired = () => {
      queryClient.clear();
      useUserStore.getState().clearUser();
      useAuthStore.setState({
        isAuthenticated: false,
        isLoading: false,
        isSessionChecked: true,
        error: 'Сессия истекла. Войдите снова.',
      });

      if (router.state.location.pathname !== PATHS.LOGIN) {
        void router.navigate({ to: PATHS.LOGIN, replace: true });
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  return null;
}
