import { createRouter, createWebHistory } from 'vue-router';
import LandingPage from '../pages/LandingPage.vue';
import HomePage from '../pages/HomePage.vue';
import AccountsPage from '../pages/AccountsPage.vue';
import CategoriesPage from '../pages/CategoriesPage.vue';
import ExpensesPage from '../pages/ExpensesPage.vue';
import AnalyticsPage from '../pages/AnalyticsPage.vue';
import ProfilePage from '../pages/ProfilePage.vue';
import LoginPage from '../pages/LoginPage.vue';
import RegisterPage from '../pages/RegisterPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingPage,
      meta: { title: 'Smart Personal Finance Tracking', public: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { title: 'Sign In', public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
      meta: { title: 'Sign Up', public: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: HomePage,
      meta: { title: 'Dashboard', requiresAuth: true },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: AccountsPage,
      meta: { title: 'Accounts', requiresAuth: true },
    },
    {
      path: '/categories',
      name: 'categories',
      component: CategoriesPage,
      meta: { title: 'Categories', requiresAuth: true },
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: ExpensesPage,
      meta: { title: 'Transactions', requiresAuth: true },
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: AnalyticsPage,
      meta: { title: 'Analytics', requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfilePage,
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
