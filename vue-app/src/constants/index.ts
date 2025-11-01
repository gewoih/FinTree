// FinTree Application Constants

export const APP_CONFIG = {
  name: 'FinTree',
  description: 'Modern personal finance tracking with insightful analytics',
  version: '1.0.0',
  author: 'FinTree Team'
} as const;

export const NAVIGATION_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    icon: 'pi pi-home',
    route: '/'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'pi pi-chart-line',
    route: '/analytics'
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: 'pi pi-wallet',
    route: '/accounts'
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: 'pi pi-tags',
    route: '/categories'
  },
  {
    id: 'expenses',
    label: 'Transactions',
    icon: 'pi pi-arrow-circle-down',
    route: '/expenses'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'pi pi-user',
    route: '/profile'
  }
] as const;

export const DATE_FORMATS = {
  display: 'dd.mm.yy',
  api: 'yyyy-mm-dd',
  full: 'dd.mm.yyyy'
} as const;

export const PAGINATION_OPTIONS = {
  defaultRows: 15,
  options: [10, 15, 25, 50] as const
} as const;

export const VALIDATION_RULES = {
  minAmount: 0.01,
  maxAmount: 999999.99,
  maxNoteLength: 500
} as const;

export const TOAST_CONFIG = {
  duration: 3000,
  positions: {
    top: 'top-right',
    bottom: 'bottom-right'
  }
} as const;

export const CURRENT_USER_ID = 'e8f7ff88-d7f9-4f7a-a7ce-dae7e191c89c';

export const ACCOUNT_TYPE_OPTIONS = [
  { label: 'Bank account', value: 0 },
  { label: 'Cash wallet', value: 1 }
] as const;
