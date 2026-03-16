import { createMemoryHistory } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as userApi from '@/api/user';
import { queryClient } from '@/api/queryClient';
import { clearCurrentUserSnapshot } from '@/features/auth/session';
import { PATHS } from './paths';
import { createAppRouter, resetRouterBootstrapForTests } from './index';

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

describe('app router', () => {
  beforeEach(() => {
    queryClient.clear();
    clearCurrentUserSnapshot();
    resetRouterBootstrapForTests();
    mockedGetCurrentUser.mockReset();
  });

  it('redirects invalid retrospective months before the page renders', async () => {
    mockedGetCurrentUser.mockResolvedValue(currentUser);

    const router = createAppRouter({
      history: createMemoryHistory({
        initialEntries: ['/reflections/not-a-month'],
      }),
    });

    await router.load();

    expect(router.state.location.pathname).toBe(PATHS.REFLECTIONS);
  });

  it('redirects unauthenticated access to protected routes', async () => {
    mockedGetCurrentUser.mockRejectedValue(createUnauthorizedError());

    const router = createAppRouter({
      history: createMemoryHistory({
        initialEntries: [PATHS.ANALYTICS],
      }),
    });

    await router.load();

    expect(router.state.location.pathname).toBe(PATHS.LOGIN);
  });
});
