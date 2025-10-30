// FinTree Application Constants

export const APP_CONFIG = {
  name: 'FinTree',
  description: 'Приложение для полноценного ведения личного капитала',
  version: '1.0.0',
  author: 'FinTree Team'
} as const;

export const NAVIGATION_ITEMS = [
  {
    id: 'home',
    label: 'Главная',
    icon: 'pi pi-home',
    route: '/'
  },
  {
    id: 'analytics',
    label: 'Аналитика',
    icon: 'pi pi-chart-line',
    route: '/analytics'
  },
  {
    id: 'accounts',
    label: 'Счета',
    icon: 'pi pi-wallet',
    route: '/accounts'
  },
  {
    id: 'categories',
    label: 'Категории',
    icon: 'pi pi-tags',
    route: '/categories'
  },
  {
    id: 'expenses',
    label: 'Расходы',
    icon: 'pi pi-arrow-circle-down',
    route: '/expenses'
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
  { label: 'Банковский счет', value: 0 },
  { label: 'Наличные', value: 1 }
] as const;
