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
      component: () => import('../pages/HomePage.vue'),
      meta: { title: 'Dashboard', requiresAuth: true },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import('../pages/AccountsPage.vue'),
      meta: { title: 'Accounts', requiresAuth: true },
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('../pages/CategoriesPage.vue'),
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
      path: '/future-income',
      name: 'future-income',
      component: () => import('../pages/FutureIncomePage.vue'),
      meta: { title: 'Future Income', requiresAuth: true },
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
  scrollBehavior() {
    return { top: 0 };
  },
});

// Navigation guard to check authentication
router.beforeEach(async to => {
  const needsAuthCheck = !!to.meta.requiresAuth || to.name === 'login' || to.name === 'register';
  if (!needsAuthCheck) return true;

  const authStore = useAuthStore();
  const isAuthenticated = await authStore.ensureSession();

  if (to.meta.requiresAuth && !isAuthenticated) {
    return '/login';
  }

  if ((to.name === 'login' || to.name === 'register') && isAuthenticated) {
    return '/dashboard';
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
