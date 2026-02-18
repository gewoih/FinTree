import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    public?: boolean;
    requiresAuth?: boolean;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('../pages/LandingPage.vue'),
      meta: { title: 'Учёт расходов через Telegram', public: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { title: 'Вход', public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../pages/RegisterPage.vue'),
      meta: { title: 'Регистрация', public: true },
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('../pages/PrivacyPolicyPage.vue'),
      meta: { title: 'Политика конфиденциальности', public: true },
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('../pages/TermsPage.vue'),
      meta: { title: 'Условия использования', public: true },
    },
    {
      path: '/blog',
      name: 'blog',
      component: () => import('../pages/BlogPage.vue'),
      meta: { title: 'Блог', public: true },
    },
    {
      path: '/careers',
      name: 'careers',
      component: () => import('../pages/CareersPage.vue'),
      meta: { title: 'Карьера', public: true },
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
      meta: { title: 'Счета', requiresAuth: true },
    },
    {
      path: '/investments',
      name: 'investments',
      component: () => import('../pages/InvestmentsPage.vue'),
      meta: { title: 'Инвестиции', requiresAuth: true },
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('../pages/CategoriesPage.vue'),
      meta: { title: 'Категории', requiresAuth: true },
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: () => import('../pages/ExpensesPage.vue'),
      meta: { title: 'Транзакции', requiresAuth: true },
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('../pages/AnalyticsPage.vue'),
      meta: { title: 'Главная', requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../pages/ProfilePage.vue'),
      meta: { title: 'Профиль', requiresAuth: true },
    },
    {
      path: '/expenses',
      redirect: '/transactions',
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
