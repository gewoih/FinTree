import { useEffect } from 'react';
import { AUTH_EXPIRED_EVENT } from '@/api';
import { queryClient } from '@/api/queryClient';
import { clearCurrentUserSnapshot } from '@/features/auth/session';
import { PATHS } from '@/router/paths';
import { router } from '@/router';

declare global {
  function ym(counterId: number, action: string, url?: string): void;
}

const YM_COUNTER_ID = 106951626;

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

    const unsubscribeRouter = router.subscribe('onResolved', () => {
      if (typeof ym !== 'undefined') {
        ym(YM_COUNTER_ID, 'hit', window.location.href);
      }
    });

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
      unsubscribeRouter();
    };
  }, []);

  return null;
}
