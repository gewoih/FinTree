import { describe, beforeEach, expect, it, vi } from 'vitest';
import { isRedirect } from '@tanstack/react-router';
import { queryClient } from '@/api/queryClient';
import { PATHS } from '@/router/paths';
import {
  clearCurrentUserSnapshot,
  ensureCurrentUserSession,
  getCurrentUserSnapshot,
} from './session';
import {
  redirectAuthenticatedUser,
  requireAuthenticatedUser,
  requireOwnerUser,
} from '@/router/routeGuards';
import * as userApi from '@/api/user';

vi.mock('@/api/user', async () => {
  const actual = await vi.importActual('@/api/user');

  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

const mockedGetCurrentUser = vi.mocked(userApi.getCurrentUser);

const currentUser = {
  id: 'user-1',
  name: 'Тестовый пользователь',
  email: 'user@example.com',
  telegramUserId: 123,
  registeredViaTelegram: false,
  baseCurrencyCode: 'RUB',
  subscription: {
    isActive: true,
    isReadOnlyMode: false,
    expiresAtUtc: null,
    monthPriceRub: 299,
    yearPriceRub: 1999,
  },
  onboardingCompleted: true,
  onboardingSkipped: false,
  isOwner: false,
} as const;

function createUnauthorizedError() {
  return {
    isAxiosError: true,
    response: {
      status: 401,
    },
  };
}

describe('session helpers', () => {
  beforeEach(() => {
    queryClient.clear();
    clearCurrentUserSnapshot();
    mockedGetCurrentUser.mockReset();
  });

  it('hydrates and reuses the current user query cache', async () => {
    mockedGetCurrentUser.mockResolvedValue(currentUser);

    const firstUser = await ensureCurrentUserSession();
    const secondUser = await ensureCurrentUserSession();

    expect(firstUser).toEqual(currentUser);
    expect(secondUser).toEqual(currentUser);
    expect(getCurrentUserSnapshot()).toEqual(currentUser);
    expect(mockedGetCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('uses the same bootstrap path for protected and owner guards', async () => {
    mockedGetCurrentUser.mockResolvedValue({
      ...currentUser,
      isOwner: true,
    });

    const authenticatedUser = await requireAuthenticatedUser();
    const ownerUser = await requireOwnerUser();

    expect(authenticatedUser.id).toBe(currentUser.id);
    expect(ownerUser.isOwner).toBe(true);
    expect(mockedGetCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('redirects protected routes to login when no session exists', async () => {
    mockedGetCurrentUser.mockRejectedValue(createUnauthorizedError());

    try {
      await requireAuthenticatedUser();
      throw new Error('Expected protected-route redirect');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);

      if (isRedirect(error)) {
        expect(error.options.to).toBe(PATHS.LOGIN);
      }
    }
  });

  it('redirects authenticated users away from public auth pages', async () => {
    mockedGetCurrentUser.mockResolvedValue(currentUser);
    await ensureCurrentUserSession();

    try {
      redirectAuthenticatedUser();
      throw new Error('Expected public-route redirect');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);

      if (isRedirect(error)) {
        expect(error.options.to).toBe(PATHS.ANALYTICS);
      }
    }
  });

  it('rethrows unexpected bootstrap failures when there is no cached user', async () => {
    const networkError = new Error('network down');
    mockedGetCurrentUser.mockRejectedValue(networkError);

    await expect(ensureCurrentUserSession()).rejects.toThrow('network down');
  });

  it('keeps the last known user during non-auth refresh failures', async () => {
    mockedGetCurrentUser.mockResolvedValue(currentUser);
    await ensureCurrentUserSession();

    mockedGetCurrentUser.mockRejectedValue(new Error('server unavailable'));

    await expect(ensureCurrentUserSession({ force: true })).resolves.toEqual(
      currentUser,
    );
  });
});
