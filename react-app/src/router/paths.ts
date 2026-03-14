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

export type PathValues = (typeof PATHS)[keyof typeof PATHS];
