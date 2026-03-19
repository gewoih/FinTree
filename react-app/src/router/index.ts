import React, { Suspense } from 'react';
import {
  type ErrorComponentProps,
  Outlet,
  type RouterHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useRouter,
} from '@tanstack/react-router';
import AppShell from '../components/layout/AppShell';
import PublicPageLayout from '../components/layout/PublicPageLayout';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { Button } from '../components/ui/button';
import { validateTransactionsRouteSearch } from '../features/transactions/transactionSearch';
import { useUiStore } from '../stores/uiStore';
import { resolveApiErrorMessage } from '../utils/errors';
import {
  bootstrapAppSession,
  redirectAuthenticatedUser,
  requireAuthenticatedUser,
  requireOwnerUser,
  validateRetroDetailMonth,
} from './routeGuards';
import { PATHS } from './paths';

const LandingPage = React.lazy(() => import('../pages/LandingPage'));
const LoginPage = React.lazy(() => import('../pages/LoginPage'));
const RegisterPage = React.lazy(() => import('../pages/RegisterPage'));

const AnalyticsPage = React.lazy(() => import('../pages/AnalyticsPage'));
const AccountsPage = React.lazy(() => import('../pages/AccountsPage'));
const TransactionsPage = React.lazy(() => import('../pages/TransactionsPage.tsx'));
const CategoriesPage = React.lazy(() => import('../pages/CategoriesPage'));
const InvestmentsPage = React.lazy(() => import('../pages/InvestmentsPage'));
const ReflectionsPage = React.lazy(() => import('../pages/ReflectionsPage'));
const RetroDetailPage = React.lazy(() => import('../pages/RetroDetailPage'));
const GoalsPage = React.lazy(() => import('../pages/GoalsPage'));
const ProfilePage = React.lazy(() => import('../pages/ProfilePage'));
const AdminPage = React.lazy(() => import('../pages/AdminPage'));

const pageLoaderFallback = React.createElement(
  'div',
  {
    className: 'flex min-h-[60vh] items-center justify-center',
    'aria-label': 'Загрузка страницы',
    'aria-live': 'polite',
  },
  React.createElement('div', {
    className:
      'h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent',
  })
);

const pageErrorFallback = React.createElement(
  'div',
  {
    className: 'flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center',
    role: 'alert',
  },
  React.createElement('p', { className: 'text-base font-medium text-foreground' }, 'Что-то пошло не так'),
  React.createElement('p', { className: 'text-sm text-muted-foreground' }, 'Обновите страницу или попробуйте позже')
);

function withSuspense(Component: React.LazyExoticComponent<React.ComponentType>) {
  return function SuspenseWrapper() {
    return React.createElement(ErrorBoundary, {
      fallback: pageErrorFallback,
      children: React.createElement(
        Suspense,
        { fallback: pageLoaderFallback },
        React.createElement(Component)
      ),
    });
  };
}

function RouteErrorFallback({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  return React.createElement(
    'div',
    {
      className:
        'flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center',
      role: 'alert',
    },
    React.createElement(
      'div',
      { className: 'space-y-2' },
      React.createElement(
        'p',
        { className: 'text-base font-medium text-foreground' },
        'Не удалось открыть страницу'
      ),
      React.createElement(
        'p',
        { className: 'max-w-md text-sm text-muted-foreground' },
        resolveApiErrorMessage(
          error,
          'Проверьте соединение и повторите попытку.'
        )
      )
    ),
    React.createElement(
      Button,
      {
        variant: 'outline',
        className: 'min-h-[44px]',
        onClick: () => {
          reset();
          void router.invalidate();
        },
      },
      'Повторить'
    )
  );
}

let isAppBootstrapDone = false;

function createRouteTree() {
  const rootRoute = createRootRoute({
    async beforeLoad() {
      if (isAppBootstrapDone) {
        return;
      }

      isAppBootstrapDone = true;
      useUiStore.getState().initTheme();
      await bootstrapAppSession();
    },
    component: Outlet,
    errorComponent: RouteErrorFallback,
  });

  const publicLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'public-layout',
    component: PublicPageLayout,
  });

  const authLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'auth-layout',
    component: Outlet,
  });

  const protectedLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'protected-layout',
    async beforeLoad() {
      await requireAuthenticatedUser();
    },
    component: AppShell,
  });

  const landingRoute = createRoute({
    getParentRoute: () => publicLayoutRoute,
    path: PATHS.HOME,
    beforeLoad() {
      redirectAuthenticatedUser();
    },
    component: withSuspense(LandingPage),
  });

  const loginRoute = createRoute({
    getParentRoute: () => authLayoutRoute,
    path: PATHS.LOGIN,
    beforeLoad() {
      redirectAuthenticatedUser();
    },
    component: withSuspense(LoginPage),
  });

  const registerRoute = createRoute({
    getParentRoute: () => authLayoutRoute,
    path: PATHS.REGISTER,
    beforeLoad() {
      redirectAuthenticatedUser();
    },
    component: withSuspense(RegisterPage),
  });

  const analyticsRoute = createRoute({
    getParentRoute: () => protectedLayoutRoute,
    path: PATHS.ANALYTICS,
    component: withSuspense(AnalyticsPage),
  });

  const accountsRoute = createRoute({
    getParentRoute: () => protectedLayoutRoute,
    path: PATHS.ACCOUNTS,
    component: withSuspense(AccountsPage),
  });

  const transactionsRoute = createRoute({
    getParentRoute: () => protectedLayoutRoute,
    path: PATHS.TRANSACTIONS,
    validateSearch: validateTransactionsRouteSearch,
    component: withSuspense(TransactionsPage),
  });

  const categoriesRoute = createRoute({
    getParentRoute: () => protectedLayoutRoute,
    path: PATHS.CATEGORIES,
    component: withSuspense(CategoriesPage),
  });

  const investmentsRoute = createRoute({
    getParentRoute: () => protectedLayoutRoute,
    path: PATHS.INVESTMENTS,
    component: withSuspense(InvestmentsPage),
  });

  const reflectionsRoute = createRoute({
    getParentRoute: () => protectedLayoutRoute,
    path: PATHS.REFLECTIONS,
    component: withSuspense(ReflectionsPage),
  });

  const retroDetailRoute = createRoute({
    getParentRoute: () => protectedLayoutRoute,
    path: PATHS.RETRO_DETAIL,
    beforeLoad({ params }) {
      validateRetroDetailMonth(params.month);
    },
    component: withSuspense(RetroDetailPage),
  });

  const goalsRoute = createRoute({
    getParentRoute: () => protectedLayoutRoute,
    path: PATHS.GOALS,
    component: withSuspense(GoalsPage),
  });

  const profileRoute = createRoute({
    getParentRoute: () => protectedLayoutRoute,
    path: PATHS.PROFILE,
    component: withSuspense(ProfilePage),
  });

  const adminRoute = createRoute({
    getParentRoute: () => protectedLayoutRoute,
    path: PATHS.ADMIN,
    async beforeLoad() {
      await requireOwnerUser();
    },
    component: withSuspense(AdminPage),
  });

  return rootRoute.addChildren([
    publicLayoutRoute.addChildren([landingRoute]),
    authLayoutRoute.addChildren([loginRoute, registerRoute]),
    protectedLayoutRoute.addChildren([
      analyticsRoute,
      accountsRoute,
      transactionsRoute,
      categoriesRoute,
      investmentsRoute,
      reflectionsRoute,
      retroDetailRoute,
      goalsRoute,
      profileRoute,
      adminRoute,
    ]),
  ]);
}

export function createAppRouter(options?: { history?: RouterHistory }) {
  return createRouter({
    routeTree: createRouteTree(),
    history: options?.history,
    defaultPreload: 'intent',
    scrollRestoration: true,
  });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
