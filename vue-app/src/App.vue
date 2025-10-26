<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useFinanceStore } from './stores/finance';
import ExpenseForm from './components/ExpenseForm.vue';
import TransactionList from './components/TransactionList.vue';
import { formatCurrency } from './utils/formatters';
import { NAVIGATION_ITEMS } from './constants';

// PrimeVue Components
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import Menubar from 'primevue/menubar';
import Panel from 'primevue/panel';

const store = useFinanceStore();

const showExpenseDialog = ref(false);
const activeTab = ref('home');

const menuItems = NAVIGATION_ITEMS.map(item => ({
  label: item.label,
  icon: item.icon,
  command: () => activeTab.value = item.id
}));

onMounted(() => {
  // Загрузка начальных данных при старте приложения
  store.fetchInitialData();
});

// Button disabled state
const buttonDisabled = computed(() => store.isLoading || !store.primaryAccount);
const baseCurrency = computed(() => store.primaryAccount?.currency ?? 'KZT');
const totalBalance = computed(() =>
  store.accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0)
);
const totalExpenses = computed(() =>
  store.transactions
    .filter(txn => txn.amount < 0)
    .reduce((sum, txn) => sum + Math.abs(txn.amount), 0)
);
const totalIncome = computed(() =>
  store.transactions
    .filter(txn => txn.amount > 0)
    .reduce((sum, txn) => sum + txn.amount, 0)
);
const netFlow = computed(() => totalIncome.value - totalExpenses.value);
const transactionsCount = computed(() => store.transactions.length);
const accountsCount = computed(() => store.accounts.length);
const categoriesCount = computed(() => store.categories.length);
</script>

<template>
  <div class="app-shell">
    <Toast />

    <header class="app-hero mb-4">
      <div class="hero-left">
        <p class="hero-badge">Умный учет финансов</p>
        <h1 class="app-title">
          <i class="pi pi-tree mr-2"></i>FinTree
        </h1>
        <p class="hero-subtitle">
          Минималистичный контроль капитала: все счета, активы и траты —
          в одном экране без лишнего шума.
        </p>
        <div class="hero-actions">
          <Menubar :model="menuItems" class="navigation-menu" />
          <Button
            label="Добавить расход"
            icon="pi pi-plus"
            severity="success"
            size="large"
            @click="showExpenseDialog = true"
            :disabled="buttonDisabled"
            :loading="store.isLoading"
          />
        </div>
      </div>
      <div class="hero-right">
        <div class="metric-card primary">
          <span class="metric-label">Совокупный баланс</span>
          <span class="metric-value">
            {{ formatCurrency(totalBalance, baseCurrency) }}
          </span>
          <small>обновляется после каждой операции</small>
        </div>
        <div class="metric-grid">
          <div class="metric-card subtle">
            <span class="metric-label">Расходы (все время)</span>
            <span class="metric-value negative">
              −{{ formatCurrency(totalExpenses, baseCurrency) }}
            </span>
          </div>
          <div class="metric-card subtle">
            <span class="metric-label">Чистый поток</span>
            <span :class="['metric-value', { negative: netFlow < 0 }]">
              {{ netFlow >= 0 ? '+' : '−' }}
              {{ formatCurrency(Math.abs(netFlow), baseCurrency) }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <section class="quick-stats mb-4">
      <article class="stat-card">
        <p class="stat-label">Счета</p>
        <h3>{{ accountsCount }}</h3>
        <small>активных</small>
      </article>
      <article class="stat-card">
        <p class="stat-label">Категории</p>
        <h3>{{ categoriesCount }}</h3>
        <small>для точного анализа</small>
      </article>
      <article class="stat-card accent">
        <p class="stat-label">Транзакции</p>
        <h3>{{ transactionsCount }}</h3>
        <small>{{ store.isLoading ? 'Загружаем...' : 'обновлено' }}</small>
      </article>
    </section>

    <main class="main-content">
      <div v-if="activeTab === 'home'" class="home-page">
        <Panel header="Фокус на важном" class="section-panel">
          <div class="hero-panel">
            <div class="hero-copy">
              <h2>Контроль без перегрузки</h2>
              <p>
                Организуйте траты, фиксируйте инвестиции, наблюдайте за
                динамикой баланса и принимайте решения уверенно.
              </p>
              <div class="feature-chips">
                <span class="feature-chip">
                  <i class="pi pi-bolt"></i> Быстрый ввод
                </span>
                <span class="feature-chip">
                  <i class="pi pi-chart-line"></i> Аналитика
                </span>
                <span class="feature-chip">
                  <i class="pi pi-wallet"></i> Управление счетами
                </span>
              </div>
            </div>
            <div class="hero-balance glass-card">
              <p class="metric-label">Главный счет</p>
              <div v-if="store.isLoading" class="loading-block">
                <i class="pi pi-spin pi-spinner text-2xl"></i>
                <span>Загрузка данных...</span>
              </div>
              <div v-else-if="store.primaryAccount">
                <p class="balance-value">
                  {{ formatCurrency(store.primaryAccount.balance, store.primaryAccount.currency) }}
                </p>
                <p class="text-sm text-500">{{ store.primaryAccount.name }}</p>
              </div>
              <div v-else class="empty-state">
                <i class="pi pi-exclamation-triangle"></i>
                <span>Нет данных о счетах</span>
              </div>
            </div>
          </div>
        </Panel>

        <div class="insight-grid">
          <Panel header="Как FinTree помогает" class="insight-card">
            <ul class="feature-list modern">
              <li><i class="pi pi-check-circle"></i> Унифицированный контроль расходов и доходов</li>
              <li><i class="pi pi-check-circle"></i> Сценарии для инвестиций и пассивов</li>
              <li><i class="pi pi-check-circle"></i> Прозрачная история операций</li>
              <li><i class="pi pi-check-circle"></i> Удобные фильтры и быстрый поиск</li>
            </ul>
          </Panel>

          <Panel header="Следующий шаг" class="insight-card">
            <p>Добавьте несколько транзакций, чтобы увидеть персональные подсказки и прогнозы.</p>
            <ul class="progress-list">
              <li>
                <span>1. Синхронизируйте счета</span>
                <i class="pi pi-angle-right"></i>
              </li>
              <li>
                <span>2. Настройте категории</span>
                <i class="pi pi-angle-right"></i>
              </li>
              <li>
                <span>3. Включите аналитику расходов</span>
                <i class="pi pi-angle-right"></i>
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      <div v-if="activeTab === 'analytics'" class="analytics-page">
        <Panel header="Аналитика" class="section-panel">
          <p class="text-center text-500">
            Визуализации и прогнозирование находятся в разработке.
          </p>
        </Panel>
      </div>

      <div v-if="activeTab === 'expenses'" class="expenses-page">
        <Panel header="История операций" class="section-panel">
          <TransactionList />
        </Panel>
      </div>
    </main>

    <ExpenseForm v-model:visible="showExpenseDialog" />
  </div>
</template>

<style>
.app-shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.app-hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  background: var(--surface-card);
  padding: 2rem;
  border-radius: 24px;
  box-shadow: 0 15px 40px rgba(15, 23, 42, 0.08);
  position: relative;
  overflow: hidden;
}

.app-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 45%);
  pointer-events: none;
}

.hero-left {
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.app-title {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 600;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hero-subtitle {
  margin: 0.75rem 0 1.5rem;
  color: var(--text-color-secondary);
  max-width: 420px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.navigation-menu {
  background: transparent;
  border: none;
  padding: 0;
}

.navigation-menu .p-menubar-root-list {
  gap: 0.75rem;
}

.hero-right {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.metric-card {
  border-radius: 18px;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric-card.primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
}

.metric-card.subtle {
  background: var(--surface-section);
  border: 1px solid var(--surface-border);
}

.metric-label {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: inherit;
  opacity: 0.8;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: inherit;
}

.metric-value.negative {
  color: #dc2626;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1.25rem;
  border-radius: 18px;
  border: 1px solid var(--surface-border);
  background: var(--surface-card);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stat-card.accent {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
  border-color: transparent;
}

.stat-label {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-card h3 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
}

.main-content {
  min-height: 60vh;
  margin-top: 2rem;
}

.section-panel {
  border-radius: 20px;
  border: none;
  background: var(--surface-card);
  box-shadow: 0 15px 40px rgba(15, 23, 42, 0.08);
}

.hero-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  align-items: center;
}

.hero-copy h2 {
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.hero-copy p {
  margin: 0 0 1rem;
  color: var(--text-color-secondary);
}

.feature-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.feature-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  background: var(--surface-100);
  font-size: 0.85rem;
}

.glass-card {
  padding: 1.5rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  min-height: 180px;
}

.balance-value {
  font-size: 2.5rem;
  font-weight: 600;
  margin: 0.5rem 0 0.25rem;
}

.loading-block,
.empty-state {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: flex-start;
  color: var(--text-color-secondary);
}

.insight-grid {
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.insight-card {
  border-radius: 18px;
  border: none;
  background: var(--surface-card);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.feature-list.modern {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.feature-list.modern li {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: var(--text-color-secondary);
}

.progress-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px dashed var(--surface-border);
  color: var(--text-color-secondary);
}

@media (max-width: 768px) {
  .app-hero {
    padding: 1.5rem;
  }

  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .navigation-menu {
    width: 100%;
  }
}
</style>
