export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ANALYTICS: '/analytics',
  ACCOUNTS: '/accounts',
  TRANSACTIONS: '/transactions',
  CATEGORIES: '/categories',
  INVESTMENTS: '/investments',
  REFLECTIONS: '/reflections',
  RETRO_DETAIL: '/reflections/$month',
  FREEDOM: '/freedom',
  GOALS: '/goals',
  PROFILE: '/profile',
  ADMIN: '/admin',
} as const;

export const ROUTE_IDS = {
  PUBLIC_LAYOUT: '/public-layout',
  AUTH_LAYOUT: '/auth-layout',
  PROTECTED_LAYOUT: '/protected-layout',
  HOME: '/public-layout/',
  LOGIN: '/auth-layout/login',
  REGISTER: '/auth-layout/register',
  ANALYTICS: '/protected-layout/analytics',
  ACCOUNTS: '/protected-layout/accounts',
  TRANSACTIONS: '/protected-layout/transactions',
  CATEGORIES: '/protected-layout/categories',
  INVESTMENTS: '/protected-layout/investments',
  REFLECTIONS: '/protected-layout/reflections',
  RETRO_DETAIL: '/protected-layout/reflections/$month',
  FREEDOM: '/protected-layout/freedom',
  GOALS: '/protected-layout/goals',
  PROFILE: '/protected-layout/profile',
  ADMIN: '/protected-layout/admin',
} as const;

export type PathValues = (typeof PATHS)[keyof typeof PATHS];
