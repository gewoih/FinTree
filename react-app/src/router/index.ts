import React, { Suspense } from 'react';
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import AppShell from '../components/layout/AppShell';
import PublicPageLayout from '../components/layout/PublicPageLayout';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { useUserStore } from '../stores/userStore';
import { PATHS } from './paths';

const LandingPage = React.lazy(() => import('../pages/LandingPage'));
const LoginPage = React.lazy(() => import('../pages/LoginPage'));
const RegisterPage = React.lazy(() => import('../pages/RegisterPage'));
const PrivacyPolicyPage = React.lazy(() => import('../pages/PrivacyPolicyPage'));
const TermsPage = React.lazy(() => import('../pages/TermsPage'));
const BlogPage = React.lazy(() => import('../pages/BlogPage'));
const CareersPage = React.lazy(() => import('../pages/CareersPage'));

const AnalyticsPage = React.lazy(() => import('../pages/AnalyticsPage'));
const AccountsPage = React.lazy(() => import('../pages/AccountsPage'));
const TransactionsPage = React.lazy(() => import('../pages/TransactionsPage'));
const CategoriesPage = React.lazy(() => import('../pages/CategoriesPage'));
const InvestmentsPage = React.lazy(() => import('../pages/InvestmentsPage'));
const ReflectionsPage = React.lazy(() => import('../pages/ReflectionsPage'));
const RetroDetailPage = React.lazy(() => import('../pages/RetroDetailPage'));
const FreedomCalculatorPage = React.lazy(
  () => import('../pages/FreedomCalculatorPage')
);
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

function withSuspense(Component: React.LazyExoticComponent<React.ComponentType>) {
  return function SuspenseWrapper() {
    return React.createElement(
      Suspense,
      { fallback: pageLoaderFallback },
      React.createElement(Component)
    );
  };
}

let isAppBootstrapDone = false;

const rootRoute = createRootRoute({
  async beforeLoad() {
    if (isAppBootstrapDone) {
      return;
    }

    isAppBootstrapDone = true;
    useUiStore.getState().initTheme();
    await useAuthStore.getState().ensureSession();
  },
  component: Outlet,
});

const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public-layout',
  component: PublicPageLayout,
});

const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected-layout',
  beforeLoad() {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      throw redirect({ to: PATHS.LOGIN });
    }
  },
  component: AppShell,
});

const landingRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.HOME,
  beforeLoad() {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: PATHS.ANALYTICS });
    }
  },
  component: withSuspense(LandingPage),
});

const loginRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.LOGIN,
  beforeLoad() {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: PATHS.ANALYTICS });
    }
  },
  component: withSuspense(LoginPage),
});

const registerRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.REGISTER,
  beforeLoad() {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: PATHS.ANALYTICS });
    }
  },
  component: withSuspense(RegisterPage),
});

const privacyRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.PRIVACY,
  component: withSuspense(PrivacyPolicyPage),
});

const termsRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.TERMS,
  component: withSuspense(TermsPage),
});

const blogRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.BLOG,
  component: withSuspense(BlogPage),
});

const careersRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.CAREERS,
  component: withSuspense(CareersPage),
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
  component: withSuspense(RetroDetailPage),
});

const freedomRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: PATHS.FREEDOM,
  component: withSuspense(FreedomCalculatorPage),
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
  beforeLoad() {
    const isOwner = useUserStore.getState().currentUser?.isOwner === true;
    if (!isOwner) {
      throw redirect({ to: PATHS.PROFILE });
    }
  },
  component: withSuspense(AdminPage),
});

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([
    landingRoute,
    loginRoute,
    registerRoute,
    privacyRoute,
    termsRoute,
    blogRoute,
    careersRoute,
  ]),
  protectedLayoutRoute.addChildren([
    analyticsRoute,
    accountsRoute,
    transactionsRoute,
    categoriesRoute,
    investmentsRoute,
    reflectionsRoute,
    retroDetailRoute,
    freedomRoute,
    goalsRoute,
    profileRoute,
    adminRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
