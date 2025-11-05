import { createRouter, createWebHistory } from 'vue-router';
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
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('fintree_jwt_token');
  const isAuthenticated = !!token;

  // If route requires auth and user is not authenticated, redirect to login
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  }
  // If user is authenticated and trying to access login/register, redirect to dashboard
  else if ((to.name === 'login' || to.name === 'register') && isAuthenticated) {
    next('/dashboard');
  }
  // Otherwise, proceed
  else {
    next();
  }
});

router.afterEach(to => {
  if (to.meta?.title) {
    document.title = `FinTree · ${to.meta.title}`;
  } else {
    document.title = 'FinTree';
  }
});

export default router;
