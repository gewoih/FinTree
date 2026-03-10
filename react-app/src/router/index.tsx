import React, { Suspense } from 'react';
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { PATHS } from './paths';

const LandingPage = React.lazy(() => import('@/pages/LandingPage'));
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('@/pages/RegisterPage'));
const AccountsPage = React.lazy(() => import('@/pages/AccountsPage'));
const ExpensesPage = React.lazy(() => import('@/pages/ExpensesPage'));
const CategoriesPage = React.lazy(() => import('@/pages/CategoriesPage'));
const AnalyticsPage = React.lazy(() => import('@/pages/AnalyticsPage'));
const GoalsPage = React.lazy(() => import('@/pages/GoalsPage'));
const FreedomCalculatorPage = React.lazy(
  () => import('@/pages/FreedomCalculatorPage')
);
const InvestmentsPage = React.lazy(() => import('@/pages/InvestmentsPage'));
const ReflectionsPage = React.lazy(() => import('@/pages/ReflectionsPage'));
const RetroDetailPage = React.lazy(() => import('@/pages/RetroDetailPage'));
const ProfilePage = React.lazy(() => import('@/pages/ProfilePage'));
const AdminPage = React.lazy(() => import('@/pages/AdminPage'));
const TermsPage = React.lazy(() => import('@/pages/TermsPage'));
const PrivacyPolicyPage = React.lazy(() => import('@/pages/PrivacyPolicyPage'));
const BlogPage = React.lazy(() => import('@/pages/BlogPage'));
const CareersPage = React.lazy(() => import('@/pages/CareersPage'));

function PageErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      Произошла ошибка.
    </div>
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">Загрузка...</div>
      }
    >
      <Outlet />
    </Suspense>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.HOME,
  component: () => <LandingPage />,
  errorComponent: PageErrorFallback,
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.LOGIN,
  component: () => <LoginPage />,
  errorComponent: PageErrorFallback,
});
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.REGISTER,
  component: () => <RegisterPage />,
  errorComponent: PageErrorFallback,
});
const accountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.ACCOUNTS,
  component: () => <AccountsPage />,
  errorComponent: PageErrorFallback,
});
const expensesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.EXPENSES,
  component: () => <ExpensesPage />,
  errorComponent: PageErrorFallback,
});
const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.CATEGORIES,
  component: () => <CategoriesPage />,
  errorComponent: PageErrorFallback,
});
const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.ANALYTICS,
  component: () => <AnalyticsPage />,
  errorComponent: PageErrorFallback,
});
const goalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.GOALS,
  component: () => <GoalsPage />,
  errorComponent: PageErrorFallback,
});
const freedomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.FREEDOM,
  component: () => <FreedomCalculatorPage />,
  errorComponent: PageErrorFallback,
});
const investRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.INVESTMENTS,
  component: () => <InvestmentsPage />,
  errorComponent: PageErrorFallback,
});
const reflectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.REFLECTIONS,
  component: () => <ReflectionsPage />,
  errorComponent: PageErrorFallback,
});
const retroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.RETRO_DETAIL,
  component: () => <RetroDetailPage />,
  errorComponent: PageErrorFallback,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.PROFILE,
  component: () => <ProfilePage />,
  errorComponent: PageErrorFallback,
});
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.ADMIN,
  component: () => <AdminPage />,
  errorComponent: PageErrorFallback,
});
const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.TERMS,
  component: () => <TermsPage />,
  errorComponent: PageErrorFallback,
});
const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.PRIVACY,
  component: () => <PrivacyPolicyPage />,
  errorComponent: PageErrorFallback,
});
const blogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.BLOG,
  component: () => <BlogPage />,
  errorComponent: PageErrorFallback,
});
const careersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.CAREERS,
  component: () => <CareersPage />,
  errorComponent: PageErrorFallback,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  accountsRoute,
  expensesRoute,
  categoriesRoute,
  analyticsRoute,
  goalsRoute,
  freedomRoute,
  investRoute,
  reflectRoute,
  retroRoute,
  profileRoute,
  adminRoute,
  termsRoute,
  privacyRoute,
  blogRoute,
  careersRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
