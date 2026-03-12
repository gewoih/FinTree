import type { TransactionsQuery } from '@/types';

export const queryKeys = {
  // Auth
  currentUser: () => ['currentUser'] as const,

  // Accounts
  accounts: {
    all: () => ['accounts'] as const,
    lists: () => [...queryKeys.accounts.all(), 'list'] as const,
    active: () => [...queryKeys.accounts.lists(), 'active'] as const,
    archived: () => [...queryKeys.accounts.lists(), 'archived'] as const,
    detail: (id: string) => [...queryKeys.accounts.all(), 'detail', id] as const,
    adjustments: (accountId: string) =>
      [...queryKeys.accounts.detail(accountId), 'adjustments'] as const,
  },

  // Transactions
  transactions: {
    all: () => ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all(), 'list'] as const,
    // `filters` is wrapped in an object so React Query compares by value, not reference.
    list: (filters: TransactionsQuery | Record<string, unknown>) =>
      [...queryKeys.transactions.lists(), { filters }] as const,
    detail: (id: string) => [...queryKeys.transactions.all(), 'detail', id] as const,
    check: () => [...queryKeys.transactions.all(), 'check'] as const,
  },

  // Categories
  categories: {
    all: () => ['categories'] as const,
    list: () => [...queryKeys.categories.all(), 'list'] as const,
    withUsage: () => [...queryKeys.categories.all(), 'withUsage'] as const,
  },

  // Analytics
  analytics: {
    all: () => ['analytics'] as const,
    dashboard: (year: number, month: number) =>
      [...queryKeys.analytics.all(), 'dashboard', { year, month }] as const,
    netWorth: (params?: { from?: string; to?: string }) =>
      [...queryKeys.analytics.all(), 'netWorth', { params }] as const,
    evolution: (year?: number) =>
      [...queryKeys.analytics.all(), 'evolution', { year }] as const,
  },

  // Retrospectives
  retrospectives: {
    all: () => ['retrospectives'] as const,
    list: () => [...queryKeys.retrospectives.all(), 'list'] as const,
    detail: (month: string) =>
      [...queryKeys.retrospectives.all(), 'detail', month] as const,
  },

  // Goals
  goals: {
    all: () => ['goals'] as const,
    simulation: (params: Record<string, unknown>) =>
      [...queryKeys.goals.all(), 'simulation', { params }] as const,
  },

  // Freedom
  freedom: {
    all: () => ['freedom'] as const,
    defaults: () => [...queryKeys.freedom.all(), 'defaults'] as const,
    calculate: (params: Record<string, unknown>) =>
      [...queryKeys.freedom.all(), 'calculate', { params }] as const,
  },

  // Investments
  investments: {
    all: () => ['investments'] as const,
    overview: () => [...queryKeys.investments.all(), 'overview'] as const,
  },

  // Admin
  admin: {
    all: () => ['admin'] as const,
    overview: () => [...queryKeys.admin.all(), 'overview'] as const,
  },

  // Currencies
  currencies: () => ['currencies'] as const,
} as const;
