export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  ACCOUNTS: '/accounts',
  EXPENSES: '/expenses',
  CATEGORIES: '/categories',

  ANALYTICS: '/analytics',
  GOALS: '/goals',
  FREEDOM: '/freedom',
  INVESTMENTS: '/investments',
  REFLECTIONS: '/reflections',
  RETRO_DETAIL: '/reflections/:month',

  PROFILE: '/profile',
  ADMIN: '/admin',

  TERMS: '/terms',
  PRIVACY: '/privacy',
  BLOG: '/blog',
  CAREERS: '/careers',
} as const;

export type AppPath = (typeof PATHS)[keyof typeof PATHS];
