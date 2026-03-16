import { useCallback, useState } from 'react';
import axios from 'axios';
import { queryOptions, useQuery } from '@tanstack/react-query';
import * as authApi from '@/api/auth';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import * as userApi from '@/api/user';
import type {
  CurrentUserDto,
  LoginPayload,
  RegisterPayload,
  TelegramLoginPayload,
} from '@/types';
import { resolveApiErrorMessage } from '@/utils/errors';

const currentUserOptions = queryOptions({
  queryKey: queryKeys.currentUser(),
  queryFn: userApi.getCurrentUser,
  staleTime: 1000 * 60 * 5,
  retry(failureCount, error) {
    return !isUnauthorized(error) && failureCount < 1;
  },
});

let sessionBootstrapPromise: Promise<CurrentUserDto | null> | null = null;

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

async function loadCurrentUser(force: boolean): Promise<CurrentUserDto | null> {
  const cachedUser = getCurrentUserSnapshot();

  try {
    return force
      ? await queryClient.fetchQuery({
          ...currentUserOptions,
          staleTime: 0,
        })
      : await queryClient.ensureQueryData(currentUserOptions);
  } catch (error) {
    if (isUnauthorized(error)) {
      clearCurrentUserSnapshot();
      return null;
    }

    if (cachedUser) {
      return cachedUser;
    }

    throw error;
  }
}

export async function ensureCurrentUserSession(options?: {
  force?: boolean;
}): Promise<CurrentUserDto | null> {
  const force = options?.force ?? false;

  if (force) {
    return loadCurrentUser(true);
  }

  if (!sessionBootstrapPromise) {
    sessionBootstrapPromise = loadCurrentUser(false).finally(() => {
      sessionBootstrapPromise = null;
    });
  }

  return sessionBootstrapPromise;
}

export function useCurrentUserQuery() {
  return useQuery(currentUserOptions);
}

export function useCurrentUser(): CurrentUserDto | null {
  return useCurrentUserQuery().data ?? null;
}

export function getCurrentUserSnapshot(): CurrentUserDto | null {
  return queryClient.getQueryData<CurrentUserDto>(queryKeys.currentUser()) ?? null;
}

export function setCurrentUserSnapshot(user: CurrentUserDto): void {
  queryClient.setQueryData(queryKeys.currentUser(), user);
}

export function clearCurrentUserSnapshot(): void {
  sessionBootstrapPromise = null;
  queryClient.removeQueries({ queryKey: queryKeys.currentUser() });
}

export async function logoutCurrentUser(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Ignore logout API errors. Local session state is cleared regardless.
  } finally {
    sessionBootstrapPromise = null;
    queryClient.clear();
  }
}

export function useAuthActions() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAuthFlow = useCallback(
    async (request: () => Promise<unknown>, fallbackMessage: string) => {
      setError(null);
      setIsLoading(true);

      try {
        await request();
        const currentUser = await ensureCurrentUserSession({ force: true });

        if (!currentUser) {
          throw new Error('User hydration failed');
        }

        return true;
      } catch (authError) {
        clearCurrentUserSnapshot();
        setError(resolveApiErrorMessage(authError, fallbackMessage));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const login = useCallback(
    (payload: LoginPayload) =>
      runAuthFlow(
        () => authApi.login(payload),
        'Не удалось войти. Проверьте Email и пароль.',
      ),
    [runAuthFlow],
  );

  const register = useCallback(
    (payload: RegisterPayload) =>
      runAuthFlow(
        () => authApi.register(payload),
        'Не удалось зарегистрироваться. Попробуйте ещё раз.',
      ),
    [runAuthFlow],
  );

  const loginWithTelegram = useCallback(
    (payload: TelegramLoginPayload) =>
      runAuthFlow(
        () => authApi.loginWithTelegram(payload),
        'Не удалось войти через Telegram.',
      ),
    [runAuthFlow],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    clearError,
    error,
    isLoading,
    login,
    loginWithTelegram,
    register,
  };
}
