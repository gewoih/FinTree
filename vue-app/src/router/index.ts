import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../pages/HomePage.vue';
import AccountsPage from '../pages/AccountsPage.vue';
import CategoriesPage from '../pages/CategoriesPage.vue';
import ExpensesPage from '../pages/ExpensesPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
      meta: { title: 'Главная' },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: AccountsPage,
      meta: { title: 'Счета' },
    },
    {
      path: '/categories',
      name: 'categories',
      component: CategoriesPage,
      meta: { title: 'Категории' },
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: ExpensesPage,
      meta: { title: 'Расходы' },
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

router.afterEach(to => {
  if (to.meta?.title) {
    document.title = `FinTree · ${to.meta.title}`;
  } else {
    document.title = 'FinTree';
  }
});

export default router;
