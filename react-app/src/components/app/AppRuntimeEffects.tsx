import { useEffect } from 'react';
import { AUTH_EXPIRED_EVENT } from '@/api';
import { queryClient } from '@/api/queryClient';
import { clearCurrentUserSnapshot } from '@/features/auth/session';
import { PATHS } from '@/router/paths';
import { router } from '@/router';

export function AppRuntimeEffects() {
  useEffect(() => {
    const handleAuthExpired = () => {
      queryClient.clear();
      clearCurrentUserSnapshot();

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
