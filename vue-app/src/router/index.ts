import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('../pages/LandingPage.vue'),
      meta: { title: 'Smart Personal Finance Tracking', public: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { title: 'Sign In', public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../pages/RegisterPage.vue'),
      meta: { title: 'Sign Up', public: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      redirect: '/analytics',
      meta: { requiresAuth: true },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import('../pages/AccountsPage.vue'),
      meta: { title: 'Accounts', requiresAuth: true },
    },
    {
      path: '/investments',
      name: 'investments',
      component: () => import('../pages/InvestmentsPage.vue'),
      meta: { title: 'Investments', requiresAuth: true },
    },
    {
      path: '/categories',
      name: 'categories',
      redirect: { path: '/profile', hash: '#categories' },
      meta: { title: 'Categories', requiresAuth: true },
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: () => import('../pages/ExpensesPage.vue'),
      meta: { title: 'Transactions', requiresAuth: true },
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('../pages/AnalyticsPage.vue'),
      meta: { title: 'Analytics', requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../pages/ProfilePage.vue'),
      meta: { title: 'Profile', requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior(to, from) {
    if (to.path === from.path) {
      return false;
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  },
});

// Navigation guard to check authentication
router.beforeEach(async to => {
  const needsAuthCheck =
    !!to.meta.requiresAuth || to.name === 'login' || to.name === 'register' || to.name === 'landing';
  if (!needsAuthCheck) return true;

  const authStore = useAuthStore();
  const isAuthenticated = await authStore.ensureSession();

  if (to.meta.requiresAuth && !isAuthenticated) {
    return '/login';
  }

  if ((to.name === 'login' || to.name === 'register') && isAuthenticated) {
    return '/analytics';
  }

  if (to.name === 'landing' && isAuthenticated) {
    return '/analytics';
  }

  return true;
});

router.afterEach(to => {
  if (to.meta?.title) {
    document.title = `FinTree · ${to.meta.title}`;
  } else {
    document.title = 'FinTree';
  }
});

export default router;
