import { useCallback, useEffect, useRef, useState } from 'react';
import { useUserStore } from '@/stores/userStore';

const DEFAULT_BOOTSTRAP_ERROR = 'Не удалось загрузить данные пользователя.';

export function useEnsureCurrentUser() {
  const currentUser = useUserStore((state) => state.currentUser);
  const isLoading = useUserStore((state) => state.isLoading);
  const requestedRef = useRef(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const ensureCurrentUser = useCallback(async () => {
    setBootstrapError(null);
    requestedRef.current = true;

    const ok = await useUserStore.getState().fetchCurrentUser();
    if (!ok && !useUserStore.getState().currentUser) {
      setBootstrapError(DEFAULT_BOOTSTRAP_ERROR);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      return;
    }

    if (isLoading || requestedRef.current) {
      return;
    }

    let isMounted = true;

    const bootstrapCurrentUser = async () => {
      requestedRef.current = true;
      const ok = await useUserStore.getState().fetchCurrentUser();

      if (isMounted && !ok && !useUserStore.getState().currentUser) {
        setBootstrapError(DEFAULT_BOOTSTRAP_ERROR);
      }
    };

    void bootstrapCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [currentUser, isLoading]);

  return {
    currentUser,
    isLoading,
    isBootstrapping: currentUser === null && bootstrapError === null,
    bootstrapError: currentUser ? null : bootstrapError,
    retryEnsureCurrentUser: ensureCurrentUser,
  };
}
