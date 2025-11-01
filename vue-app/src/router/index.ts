import { createRouter, createWebHistory } from 'vue-router';
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
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { title: 'Вход', public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
      meta: { title: 'Регистрация', public: true },
    },
    {
      path: '/',
      name: 'home',
      component: HomePage,
      meta: { title: 'Главная', requiresAuth: true },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: AccountsPage,
      meta: { title: 'Счета', requiresAuth: true },
    },
    {
      path: '/categories',
      name: 'categories',
      component: CategoriesPage,
      meta: { title: 'Категории', requiresAuth: true },
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: ExpensesPage,
      meta: { title: 'Расходы', requiresAuth: true },
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: AnalyticsPage,
      meta: { title: 'Аналитика', requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfilePage,
      meta: { title: 'Профиль', requiresAuth: true },
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
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('fintree_jwt_token');
  const isAuthenticated = !!token;

  // If route requires auth and user is not authenticated, redirect to login
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  }
  // If user is authenticated and trying to access public routes, redirect to home
  else if (to.meta.public && isAuthenticated) {
    next('/');
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
